import mongoose from "mongoose";
import net from "node:net";
import { DatabaseMonitorTypes, type DatabaseMonitorType, type Monitor, type MonitorType } from "@/domain/monitors/monitor.types.js";
import { IStatusProvider } from "@/service/network/IStatusProvider.js";
import { NETWORK_ERROR, timeRequest } from "@/service/network/utils.js";
import type { DatabaseStatusPayload, MonitorStatusResponse } from "@/types/network.js";

const SERVICE_NAME = "DatabaseProvider";
const DRIVER_MISSING_PREFIX = "DRIVER_MISSING:";

const dynamicImport = new Function("specifier", "return import(specifier)") as <T = unknown>(specifier: string) => Promise<T>;

export class DatabaseProvider implements IStatusProvider<DatabaseStatusPayload> {
	readonly type = "database";

	supports(type: MonitorType): boolean {
		return DatabaseMonitorTypes.includes(type as DatabaseMonitorType);
	}

	async handle(monitor: Monitor): Promise<MonitorStatusResponse<DatabaseStatusPayload>> {
		const databaseType = monitor.type as DatabaseMonitorType;
		const { responseTime, error } = await timeRequest(async () => {
			await this.checkDatabase(databaseType, monitor);
		});

		const payload: DatabaseStatusPayload = {
			databaseType,
			host: monitor.url,
			port: monitor.port,
			database: monitor.dbName,
			query: this.getQuery(databaseType, monitor),
			driver: this.getDriverName(databaseType),
		};

		if (error) {
			const message = error instanceof Error ? error.message : "Database check failed";
			return {
				monitorId: monitor.id,
				teamId: monitor.teamId,
				type: monitor.type,
				status: false,
				code: NETWORK_ERROR,
				message,
				responseTime,
				payload,
			};
		}

		return {
			monitorId: monitor.id,
			teamId: monitor.teamId,
			type: monitor.type,
			status: true,
			code: 200,
			message: "Database check successful",
			responseTime,
			payload,
		};
	}

	private async checkDatabase(type: DatabaseMonitorType, monitor: Monitor): Promise<void> {
		switch (type) {
			case "mysql":
				return this.checkMySql(monitor);
			case "mssql":
				return this.checkMsSql(monitor);
			case "postgres":
				return this.checkPostgres(monitor);
			case "mongodb":
				return this.checkMongoDb(monitor);
			case "oracle":
				return this.checkOracle(monitor);
			default:
				throw new Error(`Unsupported database type: ${type}`);
		}
	}

	private getDriverName(type: DatabaseMonitorType): string {
		const drivers: Record<DatabaseMonitorType, string> = {
			mysql: "mysql2",
			mssql: "mssql",
			postgres: "pg",
			mongodb: "mongoose",
			oracle: "oracledb",
		};
		return drivers[type];
	}

	private getQuery(type: DatabaseMonitorType, monitor: Monitor): string {
		if (monitor.dbQuery?.trim()) {
			return monitor.dbQuery.trim();
		}
		if (type === "oracle") {
			return "SELECT 1 FROM DUAL";
		}
		if (type === "mongodb") {
			return '{ "ping": 1 }';
		}
		return "SELECT 1";
	}

	private async importDriver<T>(driver: string): Promise<T> {
		try {
			return await dynamicImport<T>(driver);
		} catch {
			throw new Error(`${DRIVER_MISSING_PREFIX}${driver}`);
		}
	}

	private isCustomQueryConfigured(monitor: Monitor): boolean {
		return Boolean(monitor.dbQuery?.trim());
	}

	private async fallbackToTcpIfNoCustomQuery(error: unknown, driver: string, monitor: Monitor): Promise<void> {
		if (!(error instanceof Error) || error.message !== `${DRIVER_MISSING_PREFIX}${driver}`) {
			throw error;
		}
		if (this.isCustomQueryConfigured(monitor)) {
			throw new Error(`${driver} driver is not installed. Install it in the server package to run custom database queries.`);
		}
		await this.checkTcpConnection(monitor);
	}

	private async checkTcpConnection(monitor: Monitor): Promise<void> {
		const port = this.requirePort(monitor);
		await new Promise<void>((resolve, reject) => {
			const socket = net.createConnection({ host: monitor.url, port }, () => {
				socket.end();
				socket.destroy();
				resolve();
			});

			socket.setTimeout(5000);
			socket.on("timeout", () => {
				socket.destroy();
				reject(new Error("Connection timeout"));
			});
			socket.on("error", (error) => {
				socket.destroy();
				reject(error);
			});
		});
	}

	private requirePort(monitor: Monitor): number {
		if (!monitor.port) {
			throw new Error("Database port is required");
		}
		return monitor.port;
	}

	private async checkMySql(monitor: Monitor): Promise<void> {
		let mysqlModule;
		try {
			mysqlModule = await this.importDriver<any>("mysql2/promise");
		} catch (error) {
			return this.fallbackToTcpIfNoCustomQuery(error, "mysql2/promise", monitor);
		}
		const mysql = mysqlModule.default ?? mysqlModule;
		const connection = await mysql.createConnection({
			host: monitor.url,
			port: this.requirePort(monitor),
			user: monitor.dbUsername,
			password: monitor.dbPassword,
			database: monitor.dbName || undefined,
			ssl: monitor.dbUseSsl ? {} : undefined,
			connectTimeout: 5000,
		});
		try {
			await connection.execute(this.getQuery("mysql", monitor));
		} finally {
			await connection.end();
		}
	}

	private async checkPostgres(monitor: Monitor): Promise<void> {
		let pg;
		try {
			pg = await this.importDriver<any>("pg");
		} catch (error) {
			return this.fallbackToTcpIfNoCustomQuery(error, "pg", monitor);
		}
		const client = new pg.Client({
			host: monitor.url,
			port: this.requirePort(monitor),
			user: monitor.dbUsername,
			password: monitor.dbPassword,
			database: monitor.dbName || undefined,
			ssl: monitor.dbUseSsl ? { rejectUnauthorized: false } : undefined,
			connectionTimeoutMillis: 5000,
		});
		try {
			await client.connect();
			await client.query(this.getQuery("postgres", monitor));
		} finally {
			await client.end().catch(() => undefined);
		}
	}

	private async checkMsSql(monitor: Monitor): Promise<void> {
		let sql;
		try {
			sql = await this.importDriver<any>("mssql");
		} catch (error) {
			return this.fallbackToTcpIfNoCustomQuery(error, "mssql", monitor);
		}
		const pool = await sql.connect({
			server: monitor.url,
			port: this.requirePort(monitor),
			user: monitor.dbUsername,
			password: monitor.dbPassword,
			database: monitor.dbName || undefined,
			connectionTimeout: 5000,
			requestTimeout: 5000,
			options: {
				encrypt: monitor.dbUseSsl ?? false,
				trustServerCertificate: monitor.ignoreTlsErrors ?? false,
			},
		});
		try {
			await pool.request().query(this.getQuery("mssql", monitor));
		} finally {
			await pool.close();
		}
	}

	private async checkOracle(monitor: Monitor): Promise<void> {
		let oracledb;
		try {
			oracledb = await this.importDriver<any>("oracledb");
		} catch (error) {
			return this.fallbackToTcpIfNoCustomQuery(error, "oracledb", monitor);
		}
		const connectString = monitor.dbName
			? `${monitor.url}:${this.requirePort(monitor)}/${monitor.dbName}`
			: `${monitor.url}:${this.requirePort(monitor)}`;
		const connection = await oracledb.getConnection({
			user: monitor.dbUsername,
			password: monitor.dbPassword,
			connectString,
		});
		try {
			await connection.execute(this.getQuery("oracle", monitor));
		} finally {
			await connection.close();
		}
	}

	private async checkMongoDb(monitor: Monitor): Promise<void> {
		const uri = this.buildMongoUri(monitor);
		const connection = mongoose.createConnection(uri, {
			serverSelectionTimeoutMS: 5000,
		});
		try {
			await connection.asPromise();
			const command = JSON.parse(this.getQuery("mongodb", monitor));
			await connection.db?.admin().command(command);
		} finally {
			await connection.close().catch(() => undefined);
		}
	}

	private buildMongoUri(monitor: Monitor): string {
		if (/^mongodb(\+srv)?:\/\//i.test(monitor.url)) {
			return monitor.url;
		}
		const credentials =
			monitor.dbUsername || monitor.dbPassword
				? `${encodeURIComponent(monitor.dbUsername ?? "")}:${encodeURIComponent(monitor.dbPassword ?? "")}@`
				: "";
		const port = monitor.port ? `:${monitor.port}` : "";
		const database = monitor.dbName ? `/${encodeURIComponent(monitor.dbName)}` : "";
		const ssl = monitor.dbUseSsl ? "?ssl=true" : "";
		return `mongodb://${credentials}${monitor.url}${port}${database}${ssl}`;
	}
}
