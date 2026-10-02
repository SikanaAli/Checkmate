const SERVICE_NAME = "KamexProvider";
import type { Notification } from "@/domain/notifications/notification.type.js";
import { NotificationProvider } from "@/domain/notifications/providers/INotificationProvider.js";
import type { NotificationMessage } from "@/domain/notifications/notification.type.js";
import { getTestMessage } from "@/domain/notifications/providers/utils.js";
import got from "got";

interface KamexPayload {
	to: string;
	coding: number;
	charset: string;
	from: string;
	text: string;
	"dlr-mask"?: number;
	"dlr-url"?: string;
}

export class KamexProvider extends NotificationProvider {
	async sendTestAlert(notification: Partial<Notification>): Promise<boolean> {
		return this.sendText(notification, getTestMessage(), "sendTestAlert");
	}

	async sendMessage(notification: Notification, message: NotificationMessage): Promise<boolean> {
		const sent = await this.sendText(notification, this.buildSmsText(message), "sendMessage");
		if (sent) {
			this.logger.info({
				message: "Kamex SMS notification sent",
				service: SERVICE_NAME,
				method: "sendMessage",
			});
		}
		return sent;
	}

	private async sendText(notification: Partial<Notification>, text: string, method: "sendTestAlert" | "sendMessage"): Promise<boolean> {
		if (!this.hasRequiredFields(notification)) {
			return false;
		}

		const url = this.buildUrl(notification);
		const recipients = this.parseRecipients(notification.phone);

		try {
			const outcomes = await Promise.all(
				recipients.map((recipient) =>
					got.post(url, {
						json: this.buildPayload(notification, recipient, text),
						headers: {
							"x-api-key": notification.kamexApiKey!,
							"Content-Type": "application/json",
						},
						...this.gotRequestOptions(),
					})
				)
			);
			return outcomes.length === recipients.length;
		} catch (error) {
			const errMsg = error instanceof Error ? error.message : "unknown error";
			const errStack = error instanceof Error ? error.stack : undefined;
			this.logger.warn({
				message: method === "sendTestAlert" ? "Kamex SMS test alert failed" : "Kamex SMS alert failed",
				service: SERVICE_NAME,
				method,
				stack: errStack,
				details: { error: errMsg },
			});
			return false;
		}
	}

	private hasRequiredFields(notification: Partial<Notification>): boolean {
		return Boolean(
			notification.kamexHost &&
				notification.kamexPort !== undefined &&
				notification.kamexPath &&
				notification.kamexApiKey &&
				notification.kamexCoding !== undefined &&
				notification.kamexCharset &&
				notification.kamexFrom &&
				this.parseRecipients(notification.phone).length > 0
		);
	}

	private buildPayload(notification: Partial<Notification>, recipient: string, text: string): KamexPayload {
		const payload: KamexPayload = {
			to: recipient,
			coding: notification.kamexCoding!,
			charset: notification.kamexCharset!,
			from: notification.kamexFrom!,
			text,
		};

		if (notification.kamexDlrMask !== undefined) {
			payload["dlr-mask"] = notification.kamexDlrMask;
		}

		if (notification.kamexDlrUrl) {
			payload["dlr-url"] = notification.kamexDlrUrl;
		}

		return payload;
	}

	private buildUrl(notification: Partial<Notification>): string {
		const rawHost = notification.kamexHost!;
		const host = /^https?:\/\//i.test(rawHost) ? rawHost : `http://${rawHost}`;
		const url = new URL(host);
		url.port = String(notification.kamexPort!);
		url.pathname = notification.kamexPath!.startsWith("/") ? notification.kamexPath! : `/${notification.kamexPath!}`;
		return url.toString();
	}

	private parseRecipients(phone?: string): string[] {
		return (phone ?? "")
			.split(/[\s,;]+/)
			.map((recipient) => recipient.trim())
			.filter(Boolean);
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
