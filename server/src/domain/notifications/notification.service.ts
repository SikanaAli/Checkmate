import type { Monitor } from "@/domain/monitors/monitor.types.js";
import type { Notification } from "@/domain/notifications/notification.type.js";
import type { MonitorStatusResponse } from "@/types/network.js";
import type { NotificationMessage } from "@/domain/notifications/notification.type.js";
import { IMonitorsRepository } from "@/domain/monitors/monitor.repository.interface.js";
import { INotificationsRepository } from "@/domain/notifications/notification.repository.interface.js";
import { INotificationProvider } from "@/domain/notifications/providers/INotificationProvider.js";
import type { MonitorActionDecision } from "@/worker/worker.helper.js";
import type { ISettingsService } from "@/domain/app-settings/app-settings.service.js";
import { ILogger } from "@/utils/logger.js";
import type { INotificationMessageBuilder } from "@/domain/notifications/notification.message-builder.js";
import type { NotificationChannel } from "@/domain/notifications/notification.type.js";

export type NotificationProviderRegistry = Record<NotificationChannel, INotificationProvider>;

export interface INotificationsService {
	createNotification: (notificationData: Partial<Notification>, userId: string, teamId: string) => Promise<Notification>;
	findById: (id: string, teamId: string) => Promise<Notification>;
	findNotificationsByTeamId: (teamId: string) => Promise<Notification[]>;
	updateById(id: string, teamId: string, updateData: Partial<Notification>): Promise<Notification>;
	deleteById: (id: string, teamId: string) => Promise<Notification>;
	handleNotifications: (monitor: Monitor, monitorStatusResponse: MonitorStatusResponse, decision: MonitorActionDecision) => Promise<boolean>;

	sendTestNotification: (notification: Partial<Notification>) => Promise<boolean>;
	testAllNotifications: (notificationIds: string[]) => Promise<boolean>;
}

const SERVICE_NAME = "NotificationsService";
const DEFAULT_PERSISTENT_NOTIFICATION_INTERVAL_MINUTES = 60;
const PERSISTENT_SETTINGS_CACHE_MS = 30_000;

export class NotificationsService implements INotificationsService {
	static SERVICE_NAME = SERVICE_NAME;

	private notificationsRepository: INotificationsRepository;
	private monitorsRepository: IMonitorsRepository;
	private providers: NotificationProviderRegistry;
	private settingsService: ISettingsService;
	private logger: ILogger;
	private notificationMessageBuilder: INotificationMessageBuilder;
	private persistentSettingsCache: {
		enabled: boolean;
		intervalMinutes: number;
		expiresAt: number;
	} | null = null;

	constructor({
		notificationsRepository,
		monitorsRepository,
		providers,
		settingsService,
		logger,
		notificationMessageBuilder,
	}: {
		notificationsRepository: INotificationsRepository;
		monitorsRepository: IMonitorsRepository;
		providers: NotificationProviderRegistry;
		settingsService: ISettingsService;
		logger: ILogger;
		notificationMessageBuilder: INotificationMessageBuilder;
	}) {
		this.notificationsRepository = notificationsRepository;
		this.monitorsRepository = monitorsRepository;
		this.providers = providers;
		this.settingsService = settingsService;
		this.logger = logger;
		this.notificationMessageBuilder = notificationMessageBuilder;
	}

	private getPersistentNotificationSettings = async () => {
		if (this.persistentSettingsCache && this.persistentSettingsCache.expiresAt > Date.now()) {
			return this.persistentSettingsCache;
		}

		const settings = await this.settingsService.getDBSettings();
		this.persistentSettingsCache = {
			enabled: settings.persistentNotificationsEnabled ?? false,
			intervalMinutes: settings.persistentNotificationInterval ?? DEFAULT_PERSISTENT_NOTIFICATION_INTERVAL_MINUTES,
			expiresAt: Date.now() + PERSISTENT_SETTINGS_CACHE_MS,
		};
		return this.persistentSettingsCache;
	};

	private resolveNotificationDecision = async (monitor: Monitor, decision: MonitorActionDecision) => {
		if (monitor.status !== "down") {
			return { decision, persistentEnabled: false };
		}

		const globalSettings = await this.getPersistentNotificationSettings();
		const persistentEnabled = monitor.persistentNotificationsEnabled ?? globalSettings.enabled;
		const intervalMinutes = Math.max(1, monitor.persistentNotificationInterval ?? globalSettings.intervalMinutes);

		// A transition into down is always sent immediately. For an ongoing outage,
		// send again only after the configured interval has elapsed.
		const isDue =
			decision.shouldSendNotification ||
			!monitor.lastPersistentNotificationAt ||
			Date.now() - monitor.lastPersistentNotificationAt >= intervalMinutes * 60_000;

		return {
			decision:
				persistentEnabled && isDue
					? { ...decision, shouldSendNotification: true, notificationReason: decision.notificationReason ?? "status_change" }
					: decision,
			persistentEnabled,
		};
	};

	private send = async (
		notification: Notification,
		monitor: Monitor,
		monitorStatusResponse: MonitorStatusResponse,
		decision: MonitorActionDecision,
		notificationMessage: NotificationMessage | undefined
	): Promise<boolean> => {
		if (!notificationMessage) {
			this.logger.warn({
				message: "Notification message not provided",
				service: SERVICE_NAME,
				method: "send",
			});
			return false;
		}

		// Route to provider based on notification type
		const provider = this.providers[notification.type];
		if (!provider) {
			this.logger.warn({
				message: `Unknown notification type: ${notification.type}`,
				service: SERVICE_NAME,
				method: "send",
			});
			return false;
		}
		return await provider.sendMessage(notification, notificationMessage);
	};

	private sendNotifications = async (monitor: Monitor, monitorStatusResponse: MonitorStatusResponse, decision: MonitorActionDecision) => {
		const notificationIds = monitor.notifications ?? [];
		const notifications = await this.notificationsRepository.findNotificationsByIds(notificationIds);

		// Build notification message once for all notifications
		const settings = this.settingsService.getSettings();
		const clientHost = settings.clientHost || "Host not defined";
		const notificationMessage = this.notificationMessageBuilder.buildMessage(monitor, monitorStatusResponse, decision, clientHost);

		const tasks = notifications.map((notification) => this.send(notification, monitor, monitorStatusResponse, decision, notificationMessage));

		const outcomes = await Promise.all(tasks);
		const succeeded = outcomes.filter(Boolean).length;
		const failed = outcomes.length - succeeded;
		if (failed > 0) {
			this.logger.warn({
				message: `Notification send completed with ${succeeded} success, ${failed} failure(s)`,
				service: SERVICE_NAME,
				method: "sendNotifications",
			});
		}
		// Return true if all notifications succeeded
		return succeeded === notifications.length;
	};

	handleNotifications = async (monitor: Monitor, monitorStatusResponse: MonitorStatusResponse, decision: MonitorActionDecision) => {
		const resolved = await this.resolveNotificationDecision(monitor, decision);
		if (!resolved.decision.shouldSendNotification) {
			return false;
		}

		// Send notifications based on decision
		const sent = await this.sendNotifications(monitor, monitorStatusResponse, resolved.decision);
		if (sent && resolved.persistentEnabled && monitor.status === "down" && (monitor.notifications?.length ?? 0) > 0) {
			const lastPersistentNotificationAt = Date.now();
			await this.monitorsRepository.updateById(monitor.id, monitor.teamId, { lastPersistentNotificationAt });
			monitor.lastPersistentNotificationAt = lastPersistentNotificationAt;
		}
		return sent;
	};

	sendTestNotification = async (notification: Partial<Notification>) => {
		const type = notification.type;
		if (!type) {
			this.logger.warn({
				message: "Notification type not provided",
				service: SERVICE_NAME,
				method: "sendTestNotification",
			});
			return false;
		}

		const provider = this.providers[type];
		if (!provider) {
			this.logger.warn({
				message: `Unknown notification type: ${notification.type}`,
				service: SERVICE_NAME,
				method: "sendTestNotification",
			});
			return false;
		}
		return await provider.sendTestAlert(notification);
	};

	testAllNotifications = async (notificationIds: string[]) => {
		const notifications = await this.notificationsRepository.findNotificationsByIds(notificationIds);
		const tasks = notifications.map((notification) => this.sendTestNotification(notification));
		const outcomes = await Promise.all(tasks);
		const succeeded = outcomes.filter(Boolean).length;
		const failed = outcomes.length - succeeded;
		if (failed > 0) {
			return false;
		}
		return true;
	};

	createNotification = async (notificationData: Partial<Notification>, userId: string, teamId: string): Promise<Notification> => {
		notificationData.userId = userId;
		notificationData.teamId = teamId;
		return await this.notificationsRepository.create(notificationData);
	};

	findById = async (id: string, teamId: string): Promise<Notification> => {
		return await this.notificationsRepository.findById(id, teamId);
	};

	findNotificationsByTeamId = async (teamId: string): Promise<Notification[]> => {
		return await this.notificationsRepository.findByTeamId(teamId);
	};

	updateById = async (id: string, teamId: string, updateData: Partial<Notification>): Promise<Notification> => {
		if (updateData.type === "kamex" && !updateData.kamexApiKey) {
			delete updateData.kamexApiKey;
		}
		return await this.notificationsRepository.updateById(id, teamId, updateData);
	};

	deleteById = async (id: string, teamId: string): Promise<Notification> => {
		await this.monitorsRepository.removeNotificationFromMonitors(id);
		const deleted = await this.notificationsRepository.deleteById(id, teamId);
		return deleted;
	};
}
