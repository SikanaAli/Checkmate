const SERVICE_NAME = "JasminSmsProvider";
import type { Notification } from "@/domain/notifications/notification.type.js";
import { NotificationProvider } from "@/domain/notifications/providers/INotificationProvider.js";
import type { NotificationMessage } from "@/domain/notifications/notification.type.js";
import { getTestMessage } from "@/domain/notifications/providers/utils.js";
import { randomUUID } from "node:crypto";
import got from "got";

interface JasminMessage {
	"account-id"?: string;
	"report-id": string;
	to: string[];
	hex_content: string;
}

interface JasminPayload {
	globals: {
		from: string;
		"dlr-method"?: string;
		"dlr-url"?: string;
		"dlr-level"?: number;
	};
	messages: JasminMessage[];
}

export class JasminSmsProvider extends NotificationProvider {
	async sendTestAlert(notification: Partial<Notification>): Promise<boolean> {
		if (!this.hasRequiredFields(notification)) {
			return false;
		}

		try {
			await got.post(notification.address!, {
				json: this.buildPayload(notification, getTestMessage()),
				headers: {
					Authorization: notification.accessToken!,
					"Content-Type": "application/json",
				},
				...this.gotRequestOptions(),
			});
			return true;
		} catch (error) {
			const errMsg = error instanceof Error ? error.message : "unknown error";
			const errStack = error instanceof Error ? error.stack : undefined;
			this.logger.warn({
				message: "Jasmin SMS test alert failed",
				service: SERVICE_NAME,
				method: "sendTestAlert",
				stack: errStack,
				details: { error: errMsg },
			});
			return false;
		}
	}

	async sendMessage(notification: Notification, message: NotificationMessage): Promise<boolean> {
		if (!this.hasRequiredFields(notification)) {
			return false;
		}

		try {
			await got.post(notification.address!, {
				json: this.buildPayload(notification, this.buildSmsText(message)),
				headers: {
					Authorization: notification.accessToken!,
					"Content-Type": "application/json",
				},
				...this.gotRequestOptions(),
			});

			this.logger.info({
				message: "Jasmin SMS notification sent",
				service: SERVICE_NAME,
				method: "sendMessage",
			});
			return true;
		} catch (error) {
			const errMsg = error instanceof Error ? error.message : "unknown error";
			const errStack = error instanceof Error ? error.stack : undefined;
			this.logger.warn({
				message: "Jasmin SMS alert failed",
				service: SERVICE_NAME,
				method: "sendMessage",
				stack: errStack,
				details: { error: errMsg },
			});
			return false;
		}
	}

	private hasRequiredFields(notification: Partial<Notification>): boolean {
		return Boolean(
			notification.address && notification.accessToken && notification.jasminFrom && this.parseRecipients(notification.phone).length > 0
		);
	}

	private buildPayload(notification: Partial<Notification>, text: string): JasminPayload {
		const globals: JasminPayload["globals"] = {
			from: notification.jasminFrom!,
		};

		if (notification.jasminDlrEnabled) {
			if (notification.jasminDlrMethod) globals["dlr-method"] = notification.jasminDlrMethod;
			if (notification.jasminDlrUrl) globals["dlr-url"] = notification.jasminDlrUrl;
			if (notification.jasminDlrLevel !== undefined) globals["dlr-level"] = notification.jasminDlrLevel;
		}

		const message: JasminMessage = {
			"report-id": notification.jasminReportId || randomUUID(),
			to: this.parseRecipients(notification.phone),
			hex_content: this.toHexContent(text),
		};

		if (notification.jasminAccountId) {
			message["account-id"] = notification.jasminAccountId;
		}

		return {
			globals,
			messages: [message],
		};
	}

	private parseRecipients(phone?: string): string[] {
		return (phone ?? "")
			.split(/[\s,;]+/)
			.map((recipient) => recipient.trim())
			.filter(Boolean);
	}

	private toHexContent(text: string): string {
		return Buffer.from(text, "utf8").toString("hex").toUpperCase();
	}

	private buildSmsText(message: NotificationMessage): string {
		const lines: string[] = [];

		lines.push(message.content.title);
		lines.push(message.content.summary);
		lines.push("");
		lines.push(`URL: ${message.monitor.url}`);
		lines.push(`Status: ${message.monitor.status}`);

		if (message.content.thresholds && message.content.thresholds.length > 0) {
			message.content.thresholds.forEach((breach) => {
				lines.push(`${breach.metric.toUpperCase()}: ${breach.formattedValue}`);
			});
		}

		return lines.join("\n");
	}
}
