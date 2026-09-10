import { Schema, model, type Types } from "mongoose";
import type { LdapRoleMapping, Settings, SettingsThresholds } from "@/domain/app-settings/app-settings.type.js";

interface AppSettingsDocument extends Omit<Settings, "id" | "createdAt" | "updatedAt"> {
	_id: Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
}

const thresholdsSchema = new Schema<SettingsThresholds>(
	{
		cpu: { type: Number },
		memory: { type: Number },
		disk: { type: Number },
		temperature: { type: Number },
	},
	{ _id: false }
);

const ldapRoleMappingSchema = new Schema<LdapRoleMapping>(
	{
		role: { type: String, enum: ["user", "admin", "superadmin"], required: true },
		groupDn: { type: String, required: true },
	},
	{ _id: false }
);

const AppSettingsSchema = new Schema<AppSettingsDocument>(
	{
		checkTTL: { type: Number, default: 30 },
		language: { type: String, default: "gb" },
		appName: { type: String },
		appLogo: { type: String },
		jwtSecret: { type: String },
		pagespeedApiKey: { type: String },
		systemEmailHost: { type: String },
		systemEmailPort: { type: Number },
		systemEmailAddress: { type: String },
		systemEmailDisplayName: { type: String },
		systemEmailPassword: { type: String },
		systemEmailUser: { type: String },
		systemEmailConnectionHost: { type: String, default: "localhost" },
		systemEmailTLSServername: { type: String },
		systemEmailSecure: { type: Boolean, default: false },
		systemEmailPool: { type: Boolean, default: false },
		systemEmailIgnoreTLS: { type: Boolean, default: false },
		systemEmailRequireTLS: { type: Boolean, default: false },
		systemEmailRejectUnauthorized: { type: Boolean, default: true },
		ldapEnabled: { type: Boolean, default: false },
		ldapUrl: { type: String },
		ldapBindDn: { type: String },
		ldapBindPassword: { type: String },
		ldapBaseDn: { type: String },
		ldapUserSearchFilter: { type: String, default: "(mail={{email}})" },
		ldapGroupAttribute: { type: String, default: "memberOf" },
		ldapAdminGroupDn: { type: String },
		ldapRoleMappings: { type: [ldapRoleMappingSchema], default: [] },
		showURL: { type: Boolean, default: false },
		singleton: { type: Boolean, required: true, unique: true, default: true },
		version: { type: Number, default: 1 },
		globalThresholds: { type: thresholdsSchema },
	},
	{ timestamps: true }
);

const AppSettingsModel = model<AppSettingsDocument>("AppSettings", AppSettingsSchema);

export type { AppSettingsDocument };
export { AppSettingsModel };
export default AppSettingsModel;
