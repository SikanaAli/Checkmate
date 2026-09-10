import { Client } from "ldapts";
import { LdapAssignableRoles, type Settings } from "@/domain/app-settings/app-settings.type.js";
import type { UserRole } from "@/domain/users/user.type.js";
import { AppError } from "@/utils/AppError.js";
import { ILogger } from "@/utils/logger.js";

const SERVICE_NAME = "LdapService";

export interface LdapProfile {
	email: string;
	firstName: string;
	lastName: string;
	roles: UserRole[];
}

export interface ILdapService {
	authenticate(email: string, password: string, settings: Settings): Promise<LdapProfile>;
}

type LdapEntry = Record<string, unknown> & { dn?: string };

export const resolveLdapRoles = (groups: string[], settings: Settings): UserRole[] => {
	const normalizedGroups = new Set(groups.map((group) => group.trim().toLowerCase()).filter(Boolean));
	const roles = new Set<UserRole>();

	for (const mapping of settings.ldapRoleMappings ?? []) {
		const role = mapping.role;
		if (!LdapAssignableRoles.includes(role) || !mapping.groupDn) {
			continue;
		}

		if (normalizedGroups.has(mapping.groupDn.trim().toLowerCase())) {
			roles.add(role);
		}
	}

	if (settings.ldapAdminGroupDn && normalizedGroups.has(settings.ldapAdminGroupDn.trim().toLowerCase())) {
		roles.add("admin");
	}

	return roles.size > 0 ? Array.from(roles) : ["user"];
};

export class LdapService implements ILdapService {
	constructor(private logger: ILogger) {}

	authenticate = async (email: string, password: string, settings: Settings): Promise<LdapProfile> => {
		if (!settings.ldapEnabled) {
			throw new AppError({ message: "LDAP authentication is disabled", service: SERVICE_NAME, status: 400 });
		}
		if (!settings.ldapUrl || !settings.ldapBindDn || !settings.ldapBindPassword || !settings.ldapBaseDn) {
			throw new AppError({ message: "LDAP is not fully configured", service: SERVICE_NAME, status: 500 });
		}
		if (!password) {
			throw new AppError({ message: "Password is required", service: SERVICE_NAME, status: 401 });
		}

		const client = new Client({ url: settings.ldapUrl, timeout: 10_000, connectTimeout: 10_000 });
		try {
			await client.bind(settings.ldapBindDn, settings.ldapBindPassword);
			const filter = this.buildSearchFilter(settings.ldapUserSearchFilter || "(mail={{email}})", email);
			const { searchEntries } = await client.search(settings.ldapBaseDn, {
				scope: "sub",
				filter,
				sizeLimit: 2,
				attributes: ["dn", "mail", "userPrincipalName", "givenName", "sn", "cn", settings.ldapGroupAttribute || "memberOf"],
			});

			if (searchEntries.length !== 1) {
				throw new AppError({ message: "Invalid email or password", service: SERVICE_NAME, status: 401 });
			}

			const entry = searchEntries[0] as LdapEntry;
			if (!entry.dn) {
				throw new AppError({ message: "LDAP user DN not found", service: SERVICE_NAME, status: 401 });
			}

			await client.bind(entry.dn, password);
			return this.toProfile(entry, email, settings);
		} catch (error) {
			if (error instanceof AppError) throw error;
			this.logger.warn({
				message: error instanceof Error ? error.message : "LDAP authentication failed",
				service: SERVICE_NAME,
				method: "authenticate",
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw new AppError({ message: "Invalid email or password", service: SERVICE_NAME, status: 401 });
		} finally {
			await client.unbind().catch(() => undefined);
		}
	};

	private buildSearchFilter(template: string, email: string): string {
		const escapedEmail = this.escapeFilterValue(email);
		const username = email.includes("@") ? (email.split("@")[0] ?? email) : email;
		return template.replaceAll("{{email}}", escapedEmail).replaceAll("{{username}}", this.escapeFilterValue(username));
	}

	private escapeFilterValue(value: string): string {
		return value.replace(/\\/g, "\\5c").replace(/\*/g, "\\2a").replace(/\(/g, "\\28").replace(/\)/g, "\\29").replace(/\0/g, "\\00");
	}

	private toProfile(entry: LdapEntry, fallbackEmail: string, settings: Settings): LdapProfile {
		const email = this.firstString(entry.mail) || this.firstString(entry.userPrincipalName) || fallbackEmail;
		const firstName = this.firstString(entry.givenName) || this.firstString(entry.cn) || email.split("@")[0] || email;
		const lastName = this.firstString(entry.sn) || "LDAP";
		const groups = this.toStringArray(entry[settings.ldapGroupAttribute || "memberOf"]);
		const roles = resolveLdapRoles(groups, settings);
		return { email: email.toLowerCase(), firstName, lastName, roles };
	}

	private firstString(value: unknown): string | undefined {
		if (Array.isArray(value)) return value.find((item): item is string => typeof item === "string");
		return typeof value === "string" ? value : undefined;
	}

	private toStringArray(value: unknown): string[] {
		if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
		return typeof value === "string" ? [value] : [];
	}
}
