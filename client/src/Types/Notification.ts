export const NotificationChannels = [
	"email",
	"slack",
	"discord",
	"webhook",
	"pager_duty",
	"matrix",
	"teams",
	"telegram",
	"pushover",
	"twilio",
	"ntfy",
	"jasmin_sms",
] as const;
export type NotificationChannel = (typeof NotificationChannels)[number];

export const JasminDlrMethods = ["POST", "GET"] as const;
export type JasminDlrMethod = (typeof JasminDlrMethods)[number];

export interface Notification {
	id: string;
	userId: string;
	teamId: string;
	type: NotificationChannel;
	notificationName: string;
	address?: string;
	phone?: string;
	homeserverUrl?: string;
	roomId?: string;
	accessToken?: string;
	accountSid?: string;
	twilioPhoneNumber?: string;
	topic?: string;
	jasminFrom?: string;
	jasminDlrEnabled?: boolean;
	jasminDlrMethod?: JasminDlrMethod;
	jasminDlrUrl?: string;
	jasminDlrLevel?: number;
	jasminAccountId?: string;
	jasminReportId?: string;
	createdAt: string;
	updatedAt: string;
}
