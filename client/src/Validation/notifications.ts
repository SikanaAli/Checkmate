import { z } from "zod";
import { JasminDlrMethods } from "@/Types/Notification";

const baseSchema = z.object({
	notificationName: z
		.string()
		.min(1, "Notification name is required")
		.max(100, "Notification name must be at most 100 characters"),
});

const emailSchema = baseSchema.extend({
	type: z.literal("email"),
	address: z
		.string()
		.min(1, "Email is required")
		.email("Please enter a valid email address"),
});

const slackSchema = baseSchema.extend({
	type: z.literal("slack"),
	address: z.string().min(1, "Webhook URL is required").url("Please enter a valid URL"),
});

const discordSchema = baseSchema.extend({
	type: z.literal("discord"),
	address: z.string().min(1, "Webhook URL is required").url("Please enter a valid URL"),
});

const webhookSchema = baseSchema.extend({
	type: z.literal("webhook"),
	address: z.string().min(1, "Webhook URL is required").url("Please enter a valid URL"),
});

const pagerDutySchema = baseSchema.extend({
	type: z.literal("pager_duty"),
	address: z.string().min(1, "Integration key is required"),
});

const matrixSchema = baseSchema.extend({
	type: z.literal("matrix"),
	homeserverUrl: z
		.string()
		.min(1, "Homeserver URL is required")
		.url("Please enter a valid URL"),
	roomId: z.string().min(1, "Room ID is required"),
	accessToken: z.string().min(1, "Access token is required"),
});

const teamsSchema = baseSchema.extend({
	type: z.literal("teams"),
	address: z.string().min(1, "Webhook URL is required").url("Please enter a valid URL"),
});

const telegramSchema = baseSchema.extend({
	type: z.literal("telegram"),
	address: z.string().min(1, "Chat ID is required"),
	accessToken: z.string().min(1, "Bot token is required"),
});

const pushoverSchema = baseSchema.extend({
	type: z.literal("pushover"),
	address: z.string().min(1, "User key is required"),
	accessToken: z.string().min(1, "App token is required"),
});

const twilioSchema = baseSchema.extend({
	type: z.literal("twilio"),
	accountSid: z.string().min(1, "Account SID is required"),
	accessToken: z.string().min(1, "Auth token is required"),
	phone: z.string().min(1, "Recipient phone number is required"),
	twilioPhoneNumber: z.string().min(1, "Twilio phone number is required"),
});

const ntfySchema = baseSchema.extend({
	type: z.literal("ntfy"),
	address: z.string().min(1, "Server URL is required").url("Please enter a valid URL"),
	topic: z.string().min(1, "Topic is required"),
});

const jasminSmsSchema = baseSchema.extend({
	type: z.literal("jasmin_sms"),
	address: z.string().min(1, "Sendbatch URL is required").url("Please enter a valid URL"),
	accessToken: z.string().min(1, "Authorization header is required"),
	phone: z.string().min(1, "At least one recipient phone number is required"),
	jasminFrom: z.string().min(1, "Sender is required"),
	jasminDlrEnabled: z.boolean().optional(),
	jasminDlrMethod: z.enum(JasminDlrMethods).optional(),
	jasminDlrUrl: z
		.union([z.string().url("Please enter a valid URL"), z.literal("")])
		.optional(),
	jasminDlrLevel: z.number().int().min(0).max(3).optional(),
	jasminAccountId: z.string().optional(),
	jasminReportId: z.string().optional(),
});

const kamexSchema = baseSchema.extend({
	type: z.literal("kamex"),
	phone: z.string().min(1, "At least one recipient phone number is required"),
	kamexHost: z.string().min(1, "Host is required"),
	kamexPort: z.number().int().min(1).max(65535),
	kamexPath: z.string().min(1, "Path is required"),
	kamexApiKey: z.string().optional(),
	kamexCoding: z.number().int().min(0),
	kamexCharset: z.string().min(1, "Charset is required"),
	kamexFrom: z.string().min(1, "Sender is required"),
	kamexDlrMask: z.number().int().min(0).optional(),
	kamexDlrUrl: z
		.union([z.string().url("Please enter a valid URL"), z.literal("")])
		.optional(),
});

export const notificationSchema = z
	.discriminatedUnion("type", [
		emailSchema,
		slackSchema,
		discordSchema,
		webhookSchema,
		pagerDutySchema,
		matrixSchema,
		teamsSchema,
		telegramSchema,
		pushoverSchema,
		twilioSchema,
		ntfySchema,
		jasminSmsSchema,
		kamexSchema,
	])
	.superRefine((data, ctx) => {
		if (data.type !== "jasmin_sms" || !data.jasminDlrEnabled) {
			return;
		}
		if (!data.jasminDlrMethod) {
			ctx.addIssue({
				code: "custom",
				message: "DLR method is required when DLR is enabled",
				path: ["jasminDlrMethod"],
			});
		}
		if (!data.jasminDlrUrl) {
			ctx.addIssue({
				code: "custom",
				message: "DLR URL is required when DLR is enabled",
				path: ["jasminDlrUrl"],
			});
		}
		if (data.jasminDlrLevel === undefined) {
			ctx.addIssue({
				code: "custom",
				message: "DLR level is required when DLR is enabled",
				path: ["jasminDlrLevel"],
			});
		}
	});

export type NotificationFormData = z.infer<typeof notificationSchema>;
