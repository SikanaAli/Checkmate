import { z } from "zod";
import { JasminDlrMethods } from "@/domain/notifications/notification.type.js";

//****************************************
// Notification Validations
//****************************************

export const notificationBodyValidationOptions = [
	// Email notification
	z.object({
		notificationName: z.string().min(1, "Notification name is required"),
		type: z.literal("email"),
		address: z.email("Please enter a valid e-mail address"),
		homeserverUrl: z.union([z.string(), z.literal("")]).optional(),
		roomId: z.union([z.string(), z.literal("")]).optional(),
		accessToken: z.union([z.string(), z.literal("")]).optional(),
	}),
	// Webhook notification
	z.object({
		notificationName: z.string().min(1, "Notification name is required"),
		type: z.literal("webhook"),
		address: z.url({ message: "Please enter a valid Webhook URL" }),
		homeserverUrl: z.union([z.string(), z.literal("")]).optional(),
		roomId: z.union([z.string(), z.literal("")]).optional(),
		accessToken: z.union([z.string(), z.literal("")]).optional(),
	}),
	// Slack notification
	z.object({
		notificationName: z.string().min(1, "Notification name is required"),
		type: z.literal("slack"),
		address: z.url({ message: "Please enter a valid Webhook URL" }),
		homeserverUrl: z.union([z.string(), z.literal("")]).optional(),
		roomId: z.union([z.string(), z.literal("")]).optional(),
		accessToken: z.union([z.string(), z.literal("")]).optional(),
	}),
	// Discord notification
	z.object({
		notificationName: z.string().min(1, "Notification name is required"),
		type: z.literal("discord"),
		address: z.url({ message: "Please enter a valid Webhook URL" }),
		homeserverUrl: z.union([z.string(), z.literal("")]).optional(),
		roomId: z.union([z.string(), z.literal("")]).optional(),
		accessToken: z.union([z.string(), z.literal("")]).optional(),
	}),
	// PagerDuty notification
	z.object({
		notificationName: z.string().min(1, "Notification name is required"),
		type: z.literal("pager_duty"),
		address: z.string().min(1, "PagerDuty integration key is required"),
		homeserverUrl: z.union([z.string(), z.literal("")]).optional(),
		roomId: z.union([z.string(), z.literal("")]).optional(),
		accessToken: z.union([z.string(), z.literal("")]).optional(),
	}),
	// Matrix notification
	z.object({
		notificationName: z.string().min(1, "Notification name is required"),
		type: z.literal("matrix"),
		address: z.union([z.string(), z.literal("")]).optional(),
		homeserverUrl: z.url({ message: "Please enter a valid Homeserver URL" }),
		roomId: z.string().min(1, "Room ID is required"),
		accessToken: z.string().min(1, "Access Token is required"),
	}),
	// Teams notification
	z.object({
		notificationName: z.string().min(1, "Notification name is required"),
		type: z.literal("teams"),
		address: z.url({ message: "Please enter a valid Webhook URL" }),
	}),
	// Telegram notification
	z.object({
		notificationName: z.string().min(1, "Notification name is required"),
		type: z.literal("telegram"),
		address: z.string().min(1, "Chat ID is required"),
		accessToken: z.string().min(1, "Bot token is required"),
	}),
	// Pushover notification
	z.object({
		notificationName: z.string().min(1, "Notification name is required"),
		type: z.literal("pushover"),
		address: z.string().min(1, "User key is required"),
		accessToken: z.string().min(1, "App token is required"),
	}),
	// Twilio SMS notification
	z.object({
		notificationName: z.string().min(1, "Notification name is required"),
		type: z.literal("twilio"),
		accountSid: z.string().min(1, "Account SID is required"),
		accessToken: z.string().min(1, "Auth token is required"),
		phone: z.string().min(1, "Recipient phone number is required"),
		twilioPhoneNumber: z.string().min(1, "Twilio phone number is required"),
	}),
	// ntfy notification
	z.object({
		notificationName: z.string().min(1, "Notification name is required"),
		type: z.literal("ntfy"),
		address: z.url({ message: "Please enter a valid ntfy server URL" }),
		topic: z.string().min(1, "Topic is required"),
	}),
	// Jasmin SMS notification
	z.object({
		notificationName: z.string().min(1, "Notification name is required"),
		type: z.literal("jasmin_sms"),
		address: z.url({ message: "Please enter a valid Jasmin sendbatch URL" }),
		accessToken: z.string().min(1, "Authorization header is required"),
		phone: z.string().min(1, "At least one recipient phone number is required"),
		jasminFrom: z.string().min(1, "Sender is required"),
		jasminDlrEnabled: z.boolean().optional(),
		jasminDlrMethod: z.enum(JasminDlrMethods).optional(),
		jasminDlrUrl: z.union([z.url({ message: "Please enter a valid DLR URL" }), z.literal("")]).optional(),
		jasminDlrLevel: z.coerce.number().int().min(0).max(3).optional(),
		jasminAccountId: z.union([z.string(), z.literal("")]).optional(),
		jasminReportId: z.union([z.string(), z.literal("")]).optional(),
	}),
	// Kamex SMS notification
	z.object({
		notificationName: z.string().min(1, "Notification name is required"),
		type: z.literal("kamex"),
		phone: z.string().min(1, "At least one recipient phone number is required"),
		kamexHost: z.string().min(1, "Host is required"),
		kamexPort: z.coerce.number().int().min(1).max(65535),
		kamexPath: z.string().min(1, "Path is required"),
		kamexApiKey: z.string().min(1, "API key is required"),
		kamexCoding: z.coerce.number().int().min(0),
		kamexCharset: z.string().min(1, "Charset is required"),
		kamexFrom: z.string().min(1, "Sender is required"),
		kamexDlrMask: z.coerce.number().int().min(0).optional(),
		kamexDlrUrl: z.union([z.url({ message: "Please enter a valid DLR URL" }), z.literal("")]).optional(),
	}),
] as const;

export const createNotificationBodyValidation = z.discriminatedUnion("type", notificationBodyValidationOptions).superRefine((data, ctx) => {
	if (data.type !== "jasmin_sms" || !data.jasminDlrEnabled) {
		return;
	}
	if (!data.jasminDlrMethod) {
		ctx.addIssue({ code: "custom", message: "DLR method is required when DLR is enabled", path: ["jasminDlrMethod"] });
	}
	if (!data.jasminDlrUrl) {
		ctx.addIssue({ code: "custom", message: "DLR URL is required when DLR is enabled", path: ["jasminDlrUrl"] });
	}
	if (data.jasminDlrLevel === undefined) {
		ctx.addIssue({ code: "custom", message: "DLR level is required when DLR is enabled", path: ["jasminDlrLevel"] });
	}
});

const updateKamexNotificationBodyValidation = z.object({
	notificationName: z.string().min(1, "Notification name is required"),
	type: z.literal("kamex"),
	phone: z.string().min(1, "At least one recipient phone number is required"),
	kamexHost: z.string().min(1, "Host is required"),
	kamexPort: z.coerce.number().int().min(1).max(65535),
	kamexPath: z.string().min(1, "Path is required"),
	kamexApiKey: z.union([z.string(), z.literal("")]).optional(),
	kamexCoding: z.coerce.number().int().min(0),
	kamexCharset: z.string().min(1, "Charset is required"),
	kamexFrom: z.string().min(1, "Sender is required"),
	kamexDlrMask: z.coerce.number().int().min(0).optional(),
	kamexDlrUrl: z.union([z.url({ message: "Please enter a valid DLR URL" }), z.literal("")]).optional(),
});

export const updateNotificationBodyValidation = z
	.discriminatedUnion("type", [
		notificationBodyValidationOptions[0],
		notificationBodyValidationOptions[1],
		notificationBodyValidationOptions[2],
		notificationBodyValidationOptions[3],
		notificationBodyValidationOptions[4],
		notificationBodyValidationOptions[5],
		notificationBodyValidationOptions[6],
		notificationBodyValidationOptions[7],
		notificationBodyValidationOptions[8],
		notificationBodyValidationOptions[9],
		notificationBodyValidationOptions[10],
		notificationBodyValidationOptions[11],
		updateKamexNotificationBodyValidation,
	])
	.superRefine((data, ctx) => {
		if (data.type !== "jasmin_sms" || !data.jasminDlrEnabled) {
			return;
		}
		if (!data.jasminDlrMethod) {
			ctx.addIssue({ code: "custom", message: "DLR method is required when DLR is enabled", path: ["jasminDlrMethod"] });
		}
		if (!data.jasminDlrUrl) {
			ctx.addIssue({ code: "custom", message: "DLR URL is required when DLR is enabled", path: ["jasminDlrUrl"] });
		}
		if (data.jasminDlrLevel === undefined) {
			ctx.addIssue({ code: "custom", message: "DLR level is required when DLR is enabled", path: ["jasminDlrLevel"] });
		}
	});

export const testNotificationBodyValidation = createNotificationBodyValidation;

export const deleteNotificationParamValidation = z.object({
	id: z.string().min(1, "Notification ID is required"),
});
export const getNotificationByIdParamValidation = z.object({
	id: z.string().min(1, "Notification ID is required"),
});
export const editNotificationParamValidation = z.object({
	id: z.string().min(1, "Notification ID is required"),
});

export const testAllNotificationsBodyValidation = z.object({
	monitorId: z.string().min(1, "Monitor ID is required"),
});

export const sendTestEmailBodyValidation = z.object({
	to: z.string().min(1, "To field is required"),
	systemEmailHost: z.string().optional(),
	systemEmailPort: z.number().optional(),
	systemEmailSecure: z.boolean().optional(),
	systemEmailPool: z.boolean().optional(),
	systemEmailAddress: z.string().optional(),
	systemEmailDisplayName: z.string().optional(),
	systemEmailPassword: z.string().optional(),
	systemEmailUser: z.string().optional(),
	systemEmailConnectionHost: z.union([z.string(), z.literal("")]).optional(),
	systemEmailIgnoreTLS: z.boolean().optional(),
	systemEmailRequireTLS: z.boolean().optional(),
	systemEmailRejectUnauthorized: z.boolean().optional(),
	systemEmailTLSServername: z.union([z.string(), z.literal("")]).optional(),
});

export const updateNotificationsValidation = z
	.object({
		monitorIds: z.array(z.string()).min(1, "At least one monitor ID is required").max(100, "Cannot update more than 100 monitors at once"),
		notificationIds: z.array(z.string()).max(100, "Cannot specify more than 100 notification IDs at once"),
		action: z.enum(["add", "remove", "set"] as const),
	})
	.refine(
		(data) => {
			if (data.action !== "set" && data.notificationIds.length === 0) return false;
			return true;
		},
		{
			message: "Notification IDs cannot be empty unless action is 'set'",
			path: ["notificationIds"],
		}
	);
