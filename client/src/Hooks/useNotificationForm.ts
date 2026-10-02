import { useMemo } from "react";
import { notificationSchema } from "@/Validation/notifications";
import type { NotificationFormData } from "@/Validation/notifications";
import type { Notification } from "@/Types/Notification";

interface UseNotificationFormOptions {
	data?: Notification | null;
}

function buildDefaults(data: Notification | null): NotificationFormData {
	if (data?.type === "matrix") {
		return {
			type: "matrix",
			notificationName: data.notificationName || "",
			homeserverUrl: data.homeserverUrl || "",
			roomId: data.roomId || "",
			accessToken: data.accessToken || "",
		};
	}
	if (data?.type === "telegram") {
		return {
			type: "telegram",
			notificationName: data.notificationName || "",
			address: data.address || "",
			accessToken: data.accessToken || "",
		};
	}
	if (data?.type === "slack") {
		return {
			type: "slack",
			notificationName: data.notificationName || "",
			address: data.address || "",
		};
	}
	if (data?.type === "discord") {
		return {
			type: "discord",
			notificationName: data.notificationName || "",
			address: data.address || "",
		};
	}
	if (data?.type === "webhook") {
		return {
			type: "webhook",
			notificationName: data.notificationName || "",
			address: data.address || "",
		};
	}
	if (data?.type === "pager_duty") {
		return {
			type: "pager_duty",
			notificationName: data.notificationName || "",
			address: data.address || "",
		};
	}
	if (data?.type === "teams") {
		return {
			type: "teams",
			notificationName: data.notificationName || "",
			address: data.address || "",
		};
	}
	if (data?.type === "twilio") {
		return {
			type: "twilio",
			notificationName: data.notificationName || "",
			accountSid: data.accountSid || "",
			accessToken: data.accessToken || "",
			phone: data.phone || "",
			twilioPhoneNumber: data.twilioPhoneNumber || "",
		};
	}
	if (data?.type === "pushover") {
		return {
			type: "pushover",
			notificationName: data.notificationName || "",
			address: data.address || "",
			accessToken: data.accessToken || "",
		};
	}
	if (data?.type === "ntfy") {
		return {
			type: "ntfy",
			notificationName: data.notificationName || "",
			address: data.address || "",
			topic: data.topic || "",
		};
	}
	if (data?.type === "jasmin_sms") {
		return {
			type: "jasmin_sms",
			notificationName: data.notificationName || "",
			address: data.address || "",
			accessToken: data.accessToken || "",
			phone: data.phone || "",
			jasminFrom: data.jasminFrom || "",
			jasminDlrEnabled: data.jasminDlrEnabled ?? false,
			jasminDlrMethod: data.jasminDlrMethod || "POST",
			jasminDlrUrl: data.jasminDlrUrl || "",
			jasminDlrLevel: data.jasminDlrLevel ?? 2,
			jasminAccountId: data.jasminAccountId || "",
			jasminReportId: data.jasminReportId || "",
		};
	}
	if (data?.type === "kamex") {
		return {
			type: "kamex",
			notificationName: data.notificationName || "",
			phone: data.phone || "",
			kamexHost: data.kamexHost || "",
			kamexPort: data.kamexPort ?? 13013,
			kamexPath: data.kamexPath || "/cgi-bin/sendsms",
			kamexApiKey: "",
			kamexCoding: data.kamexCoding ?? 2,
			kamexCharset: data.kamexCharset || "UTF-8",
			kamexFrom: data.kamexFrom || "",
			kamexDlrMask: data.kamexDlrMask,
			kamexDlrUrl: data.kamexDlrUrl || "",
		};
	}
	// Default: email (covers both data === null and data.type === "email")
	return {
		type: "email",
		notificationName: data?.notificationName || "",
		address: data?.address || "",
	};
}

export const useNotificationForm = ({ data = null }: UseNotificationFormOptions = {}) => {
	return useMemo(() => {
		const defaults = buildDefaults(data);
		return { schema: notificationSchema, defaults };
	}, [data]);
};
