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
	"kamex",
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
	kamexHost?: string;
	kamexPort?: number;
	kamexPath?: string;
	kamexApiKey?: string;
	kamexCoding?: number;
	kamexCharset?: string;
	kamexFrom?: string;
	kamexDlrMask?: number;
	kamexDlrUrl?: string;
	createdAt: string;
	updatedAt: string;
}

export interface AlertPagerDutyPayload {
	routing_key?: string;
	dedup_key?: string;
	event_action?: "trigger" | "resolve";
	payload: Record<string, unknown>;
}

export interface AlertMatrixPayload {
	plainText: string;
	htmlText: string;
}

export interface DiscordEmbedField {
	name: string;
	value: string;
	inline?: boolean;
}

export interface AlertDiscordPayload {
	title: string;
	description: string;
	color: number;
	fields: DiscordEmbedField[];
	timestamp: string;
}

/**
 * Unified notification message types for cross-provider consistency
 * Part of notification system unification effort
 */

export type NotificationType = "monitor_down" | "monitor_up" | "threshold_breach" | "threshold_resolved" | "test";

export type NotificationSeverity = "critical" | "warning" | "info" | "success";

export interface MonitorInfo {
	id: string;
	name: string;
	url: string;
	type: string;
	status: string;
}

export interface ThresholdBreach {
	metric: "cpu" | "memory" | "disk" | "temp";
	currentValue: number;
	threshold: number;
	unit: string;
	formattedValue: string; // e.g., "85%" or "72°C"
}

export interface IncidentInfo {
	id: string;
	url: string;
	createdAt: Date;
	resolvedAt?: Date;
	duration?: string;
}

export interface NotificationContent {
	title: string;
	summary: string;
	details?: string[];
	thresholds?: ThresholdBreach[];
	incident?: IncidentInfo;
	timestamp: Date;
}

export interface NotificationMessage {
	type: NotificationType;
	severity: NotificationSeverity;
	monitor: MonitorInfo;
	content: NotificationContent;
	clientHost: string;
	metadata: {
		teamId: string;
		notificationReason: string;
	};
}
