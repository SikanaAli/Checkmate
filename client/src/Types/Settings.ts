export interface SettingsThresholds {
	cpu?: number;
	memory?: number;
	disk?: number;
	temperature?: number;
}

export type LdapAssignableRole = "user" | "admin" | "superadmin";

export interface LdapRoleMapping {
	role: LdapAssignableRole;
	groupDn: string;
}

export interface Settings {
	id: string;
	checkTTL: number;
	language: string;
	appName?: string;
	appLogo?: string;
	systemEmailHost?: string;
	systemEmailPort?: number;
	systemEmailAddress?: string;
	systemEmailDisplayName?: string;
	systemEmailUser?: string;
	systemEmailConnectionHost?: string;
	systemEmailTLSServername?: string;
	systemEmailSecure: boolean;
	systemEmailPool: boolean;
	systemEmailIgnoreTLS: boolean;
	systemEmailRequireTLS: boolean;
	systemEmailRejectUnauthorized: boolean;
	ldapEnabled: boolean;
	ldapUrl?: string;
	ldapBindDn?: string;
	ldapBaseDn?: string;
	ldapUserSearchFilter?: string;
	ldapGroupAttribute?: string;
	ldapAdminGroupDn?: string;
	ldapRoleMappings?: LdapRoleMapping[];
	showURL: boolean;
	singleton: boolean;
	globalThresholds?: SettingsThresholds;
	createdAt: string;
	updatedAt: string;
}

export interface AppSettingsResponse {
	pagespeedKeySet: boolean;
	emailPasswordSet: boolean;
	ldapBindPasswordSet: boolean;
	settings: Settings;
}
