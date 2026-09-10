import { CHECK_TTL_SENTINEL } from "@/domain/checks/check.type.js";
import { z } from "zod";

//****************************************
// Settings Validations
//****************************************

export const updateAppSettingsBodyValidation = z
	.object({
		checkTTL: z.number().int().min(1).max(CHECK_TTL_SENTINEL).optional(),
		systemEmailPort: z.number().nullable().optional(),
		pagespeedApiKey: z.string().nullable().optional(),
		language: z.string().optional(),
		timezone: z.string().optional(),
		appName: z
			.string()
			.max(80)
			.transform((val) => (val.trim() === "" ? null : val.trim()))
			.nullable()
			.optional(),
		appLogo: z
			.string()
			.max(500_000)
			.refine((val) => val === "" || val.startsWith("data:image/"), {
				message: "Application logo must be an image data URL",
			})
			.transform((val) => (val === "" ? null : val))
			.nullable()
			.optional(),
		systemEmailHost: z.string().nullable().optional(),
		systemEmailAddress: z.string().nullable().optional(),
		systemEmailDisplayName: z
			.string()
			.max(100)
			.transform((val) => (val.trim() === "" ? null : val.trim()))
			.nullable()
			.optional(),
		systemEmailPassword: z.string().nullable().optional(),
		systemEmailUser: z.string().nullable().optional(),
		systemEmailConnectionHost: z.string().nullable().optional(),
		systemEmailTLSServername: z.string().nullable().optional(),

		showURL: z.boolean().optional(),
		systemEmailSecure: z.boolean().optional(),
		systemEmailPool: z.boolean().optional(),
		systemEmailIgnoreTLS: z.boolean().optional(),
		systemEmailRequireTLS: z.boolean().optional(),
		systemEmailRejectUnauthorized: z.boolean().optional(),
		ldapEnabled: z.boolean().optional(),
		ldapUrl: z.string().trim().nullable().optional(),
		ldapBindDn: z.string().trim().nullable().optional(),
		ldapBindPassword: z.string().nullable().optional(),
		ldapBaseDn: z.string().trim().nullable().optional(),
		ldapUserSearchFilter: z.string().trim().nullable().optional(),
		ldapGroupAttribute: z.string().trim().nullable().optional(),
		ldapAdminGroupDn: z.string().trim().nullable().optional(),
		ldapRoleMappings: z
			.array(
				z.object({
					role: z.enum(["user", "admin", "superadmin"]),
					groupDn: z.string().trim().min(1),
				})
			)
			.optional(),

		globalThresholds: z
			.object({
				cpu: z.number().min(1).max(100).optional(),
				memory: z.number().min(1).max(100).optional(),
				disk: z.number().min(1).max(100).optional(),
				temperature: z.number().min(1).max(150).optional(),
			})
			.optional(),
	})
	.strip();
