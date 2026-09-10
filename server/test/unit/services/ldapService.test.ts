import { describe, expect, it } from "@jest/globals";
import { resolveLdapRoles } from "../../../src/domain/users/ldap.service.ts";
import type { Settings } from "../../../src/domain/app-settings/app-settings.type.ts";

const makeSettings = (overrides?: Partial<Settings>): Settings =>
	({
		id: "settings-1",
		checkTTL: 30,
		language: "en",
		systemEmailSecure: false,
		systemEmailPool: false,
		systemEmailIgnoreTLS: false,
		systemEmailRequireTLS: false,
		systemEmailRejectUnauthorized: true,
		ldapEnabled: true,
		showURL: false,
		singleton: true,
		version: 1,
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	}) as Settings;

describe("resolveLdapRoles", () => {
	it("defaults LDAP users to the user role when no group mapping matches", () => {
		const roles = resolveLdapRoles(
			["CN=Other,OU=Groups,DC=example,DC=com"],
			makeSettings({
				ldapRoleMappings: [{ role: "admin", groupDn: "CN=Admins,OU=Groups,DC=example,DC=com" }],
			})
		);

		expect(roles).toEqual(["user"]);
	});

	it("maps matching LDAP groups to configured roles", () => {
		const roles = resolveLdapRoles(
			["CN=Checkmate Users,OU=Groups,DC=example,DC=com", "CN=Checkmate Owners,OU=Groups,DC=example,DC=com"],
			makeSettings({
				ldapRoleMappings: [
					{ role: "user", groupDn: "CN=Checkmate Users,OU=Groups,DC=example,DC=com" },
					{ role: "superadmin", groupDn: "CN=Checkmate Owners,OU=Groups,DC=example,DC=com" },
				],
			})
		);

		expect(roles).toEqual(["user", "superadmin"]);
	});

	it("keeps the legacy admin group setting working", () => {
		const roles = resolveLdapRoles(
			["cn=checkmate admins,ou=groups,dc=example,dc=com"],
			makeSettings({
				ldapAdminGroupDn: "CN=Checkmate Admins,OU=Groups,DC=example,DC=com",
			})
		);

		expect(roles).toEqual(["admin"]);
	});
});
