import { Schema, model, type Types } from "mongoose";
import { JasminDlrMethods } from "@/domain/notifications/notification.type.js";
import type { Notification, NotificationChannel } from "@/domain/notifications/notification.type.js";

interface NotificationDocument extends Omit<Notification, "id" | "userId" | "teamId" | "createdAt" | "updatedAt"> {
	_id: Types.ObjectId;
	userId: Types.ObjectId;
	teamId: Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
}

const NotificationSchema = new Schema<NotificationDocument>(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "User",
			immutable: true,
			required: true,
		},
		teamId: {
			type: Schema.Types.ObjectId,
			ref: "Team",
			immutable: true,
			required: true,
		},
		type: {
			type: String,
			enum: [
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
			] as NotificationChannel[],
			required: true,
		},
		notificationName: {
			type: String,
			required: true,
		},
		address: { type: String },
		phone: { type: String },
		homeserverUrl: { type: String },
		roomId: { type: String },
		accessToken: { type: String },
		accountSid: { type: String },
		twilioPhoneNumber: { type: String },
		topic: { type: String },
		jasminFrom: { type: String },
		jasminDlrEnabled: { type: Boolean },
		jasminDlrMethod: { type: String, enum: JasminDlrMethods },
		jasminDlrUrl: { type: String },
		jasminDlrLevel: { type: Number },
		jasminAccountId: { type: String },
		jasminReportId: { type: String },
		kamexHost: { type: String },
		kamexPort: { type: Number },
		kamexPath: { type: String },
		kamexApiKey: { type: String },
		kamexCoding: { type: Number },
		kamexCharset: { type: String },
		kamexFrom: { type: String },
		kamexDlrMask: { type: Number },
		kamexDlrUrl: { type: String },
	},
	{
		timestamps: true,
	}
);

const NotificationModel = model<NotificationDocument>("Notification", NotificationSchema);

export type { NotificationDocument };
export { NotificationModel };
export default NotificationModel;
