import { CHECK_TTL_SENTINEL } from "@/Types/Check";
import { z } from "zod";

const ldapAssignableRoles = ["user", "admin", "superadmin"] as const;

const parseLdapRoleMappings = (
	value: string,
	ctx: z.RefinementCtx
): { role: (typeof ldapAssignableRoles)[number]; groupDn: string }[] => {
	const mappings: { role: (typeof ldapAssignableRoles)[number]; groupDn: string }[] = [];

	value
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.forEach((line, index) => {
			const separatorIndex = line.indexOf("=");
			const role = line.slice(0, separatorIndex).trim().toLowerCase();
			const groupDn = line.slice(separatorIndex + 1).trim();

			if (separatorIndex <= 0 || !groupDn) {
				ctx.addIssue({
					code: "custom",
					message: `LDAP role mapping line ${index + 1} must use role=groupDN`,
				});
				return;
			}

			if (!ldapAssignableRoles.includes(role as (typeof ldapAssignableRoles)[number])) {
				ctx.addIssue({
					code: "custom",
					message: `LDAP role mapping line ${index + 1} must start with user, admin, or superadmin`,
				});
				return;
			}

			mappings.push({ role: role as (typeof ldapAssignableRoles)[number], groupDn });
		});

	return mappings;
};

export const settingsSchema = z.object({
	systemEmailIgnoreTLS: z.boolean(),
	systemEmailRequireTLS: z.boolean(),
	systemEmailRejectUnauthorized: z.boolean(),
	systemEmailConnectionHost: z
		.string()
		.transform((val) => (val.trim() === "" ? null : val.trim()))
		.optional(),
	systemEmailSecure: z.boolean().optional(),
	systemEmailPool: z.boolean().optional(),
	showURL: z.boolean().optional(),
	checkTTL: z
		.number()
		.int()
		.min(1, "Please enter a value")
		.max(CHECK_TTL_SENTINEL, `Maximum ${CHECK_TTL_SENTINEL}`),
	pagespeedApiKey: z
		.string()
		.transform((val) => (val.trim() === "" ? null : val.trim()))
		.optional(),
	appName: z
		.string()
		.max(80, "Application name must be 80 characters or fewer")
		.transform((val) => (val.trim() === "" ? null : val.trim()))
		.optional(),
	appLogo: z
		.string()
		.refine((val) => val === "" || val.startsWith("data:image/"), {
			message: "Application logo must be an image",
		})
		.transform((val) => (val === "" ? null : val))
		.optional(),
	systemEmailHost: z
		.string()
		.regex(/^[a-zA-Z0-9.-]*$/, "Invalid hostname or IP address")
		.transform((val) => (val.trim() === "" ? null : val.trim()))
		.optional(),
	systemEmailPort: z.number().int().min(1).max(65535).optional(),
	systemEmailAddress: z
		.email("Please enter a valid email address")
		.or(z.literal(""))
		.transform((val) => (val === "" ? null : val.toLowerCase().trim()))
		.optional(),
	systemEmailDisplayName: z
		.string()
		.max(100, "Display name must be 100 characters or fewer")
		.transform((val) => (val.trim() === "" ? null : val.trim()))
		.optional(),
	systemEmailUser: z
		.string()
		.transform((val) => (val.trim() === "" ? null : val.trim()))
		.optional(),
	systemEmailPassword: z
		.string()
		.transform((val) => (val.trim() === "" ? null : val.trim()))
		.optional(),
	systemEmailTLSServername: z
		.string()
		.transform((val) => (val.trim() === "" ? null : val.trim()))
		.optional(),
	ldapEnabled: z.boolean().optional(),
	ldapUrl: z
		.string()
		.transform((val) => (val.trim() === "" ? null : val.trim()))
		.optional(),
	ldapBindDn: z
		.string()
		.transform((val) => (val.trim() === "" ? null : val.trim()))
		.optional(),
	ldapBindPassword: z
		.string()
		.transform((val) => (val.trim() === "" ? null : val.trim()))
		.optional(),
	ldapBaseDn: z
		.string()
		.transform((val) => (val.trim() === "" ? null : val.trim()))
		.optional(),
	ldapUserSearchFilter: z
		.string()
		.transform((val) => (val.trim() === "" ? null : val.trim()))
		.optional(),
	ldapGroupAttribute: z
		.string()
		.transform((val) => (val.trim() === "" ? null : val.trim()))
		.optional(),
	ldapAdminGroupDn: z
		.string()
		.transform((val) => (val.trim() === "" ? null : val.trim()))
		.optional(),
	ldapRoleMappings: z
		.string()
		.transform((val, ctx) => parseLdapRoleMappings(val, ctx))
		.optional(),
	globalThresholds: z.object({
		cpu: z.number().int().min(1).max(100),
		memory: z.number().int().min(1).max(100),
		disk: z.number().int().min(1).max(100),
		temperature: z.number().int().min(1).max(150),
	}),
});

export type SettingsFormInput = z.input<typeof settingsSchema>;
export type SettingsFormData = z.infer<typeof settingsSchema>;
