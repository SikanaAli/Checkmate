import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { DatabaseProvider } from "../../../../src/service/network/DatabaseProvider.ts";
import type { Monitor } from "../../../../src/domain/monitors/monitor.types.ts";

const createMonitor = (overrides?: Partial<Monitor>): Monitor =>
	({
		id: "monitor-1",
		teamId: "team-1",
		type: "mysql",
		url: "db.example.com",
		port: 3306,
		dbName: "app",
		dbUsername: "monitor",
		dbPassword: "secret",
		dbQuery: "",
		dbUseSsl: false,
		...overrides,
	}) as Monitor;

describe("DatabaseProvider", () => {
	beforeEach(() => jest.restoreAllMocks());

	it.each(["mysql", "mssql", "postgres", "mongodb", "oracle"] as const)("supports %s monitors", (type) => {
		const provider = new DatabaseProvider();
		expect(provider.supports(type)).toBe(true);
	});

	it("returns a down response when a custom query needs a missing SQL driver", async () => {
		const provider = new DatabaseProvider();

		const result = await provider.handle(createMonitor({ type: "mysql", dbQuery: "SELECT 1" }));

		expect(result.status).toBe(false);
		expect(result.message).toContain("mysql2/promise driver is not installed");
		expect(result.payload).toEqual(
			expect.objectContaining({
				databaseType: "mysql",
				host: "db.example.com",
				database: "app",
				driver: "mysql2",
			})
		);
		expect(JSON.stringify(result)).not.toContain("secret");
	});
});
