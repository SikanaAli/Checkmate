import { BasePage, ConfigBox } from "@/Components/design-elements";
import { TextField, Select, Button, SwitchComponent } from "@/Components/inputs";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";

import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGet, usePost, usePatch } from "@/Hooks/UseApi";
import { useNotificationForm } from "@/Hooks/useNotificationForm";
import type { NotificationFormData } from "@/Validation/notifications";
import type { Notification } from "@/Types/Notification";
import { useTranslation } from "react-i18next";
import { JasminDlrMethods, NotificationChannels } from "@/Types/Notification";

const NotificationsCreatePage = () => {
	const { t } = useTranslation();
	const theme = useTheme();
	const navigate = useNavigate();
	const { notificationId } = useParams<{ notificationId: string }>();
	const isEditMode = Boolean(notificationId);

	const { data: existingNotification } = useGet<Notification>(
		isEditMode ? `/notifications/${notificationId}` : null
	);

	const { post, loading: isSubmitting } = usePost<NotificationFormData, Notification>();
	const { patch, loading: isPatching } = usePatch<NotificationFormData, Notification>();
	const { post: testPost, loading: isTesting } = usePost<NotificationFormData, void>();

	const { schema, defaults } = useNotificationForm({ data: existingNotification });

	const form = useForm<NotificationFormData>({
		resolver: zodResolver(schema),
		defaultValues: defaults,
	});

	const { control, watch, reset, handleSubmit, clearErrors, trigger, getValues } = form;

	useEffect(() => {
		reset(defaults);
	}, [defaults, reset]);

	const watchedType = watch("type");
	const watchedJasminDlrEnabled = watch("jasminDlrEnabled");

	useEffect(() => {
		clearErrors();
	}, [watchedType, clearErrors]);

	const addressConfig = useMemo(() => {
		if (watchedType === "pager_duty") {
			return {
				title: t("pages.notifications.form.pagerDuty.title"),
				description: t("pages.notifications.form.pagerDuty.description"),
				fieldLabel: t("pages.notifications.form.pagerDuty.optionIntegrationKey"),
				placeholder: t("pages.notifications.form.pagerDuty.placeholder"),
			};
		}
		if (watchedType === "email") {
			return {
				title: t("pages.notifications.form.address.title"),
				description: t("pages.notifications.form.address.description"),
				fieldLabel: t("pages.notifications.form.address.optionAddress"),
				placeholder: t("pages.notifications.form.address.placeholderEmail"),
			};
		}
		return {
			title: t("pages.notifications.form.address.title"),
			description: t("pages.notifications.form.address.description"),
			fieldLabel: t("pages.notifications.form.address.optionAddress"),
			placeholder: t("pages.notifications.form.address.placeholderWebhook"),
		};
	}, [watchedType, t]);

	const onSubmit = async (data: NotificationFormData) => {
		const result = isEditMode
			? await patch(`/notifications/${notificationId}`, data)
			: await post("/notifications", data);
		if (result) {
			navigate("/notifications");
		}
	};

	const handleTest = async () => {
		const isValid = await trigger();
		if (!isValid) return;
		const data = getValues();
		await testPost("/notifications/test", data);
	};

	return (
		<BasePage
			component="form"
			onSubmit={handleSubmit(onSubmit)}
		>
			<ConfigBox
				title={t("pages.notifications.form.notificationName.title")}
				subtitle={t("pages.notifications.form.notificationName.description")}
				rightContent={
					<Controller
						name="notificationName"
						control={control}
						defaultValue={defaults.notificationName}
						render={({ field, fieldState }) => (
							<TextField
								{...field}
								type="text"
								fieldLabel={t("pages.notifications.form.notificationName.optionName")}
								placeholder={t("pages.notifications.form.notificationName.placeholder")}
								fullWidth
								error={!!fieldState.error}
								helperText={fieldState.error?.message ?? ""}
							/>
						)}
					/>
				}
			/>
			<ConfigBox
				title={t("pages.notifications.form.type.title")}
				subtitle={t("pages.notifications.form.type.description")}
				rightContent={
					<Controller
						name="type"
						control={control}
						defaultValue={defaults.type}
						render={({ field, fieldState }) => (
							<Select
								value={field.value}
								fieldLabel={t("pages.notifications.form.type.optionType")}
								error={!!fieldState.error}
								onChange={field.onChange}
							>
								{NotificationChannels.map((type: string) => (
									<MenuItem
										key={type}
										value={type}
									>
										<Typography textTransform="capitalize">{type}</Typography>
									</MenuItem>
								))}
							</Select>
						)}
					/>
				}
			/>
			{watchedType !== "matrix" &&
				watchedType !== "telegram" &&
				watchedType !== "pushover" &&
				watchedType !== "twilio" &&
				watchedType !== "ntfy" &&
				watchedType !== "jasmin_sms" && (
					<ConfigBox
						title={addressConfig.title}
						subtitle={addressConfig.description}
						rightContent={
							<Controller
								name="address"
								control={control}
								defaultValue={"address" in defaults ? defaults.address : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={addressConfig.fieldLabel}
										placeholder={addressConfig.placeholder}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
						}
					/>
				)}
			{watchedType === "jasmin_sms" && (
				<ConfigBox
					title={t("pages.notifications.form.jasminSms.title")}
					subtitle={t("pages.notifications.form.jasminSms.description")}
					rightContent={
						<Stack spacing={theme.spacing(8)}>
							<Controller
								name="address"
								control={control}
								defaultValue={"address" in defaults ? defaults.address : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t(
											"pages.notifications.form.jasminSms.optionSendbatchUrl"
										)}
										placeholder={t(
											"pages.notifications.form.jasminSms.placeholderSendbatchUrl"
										)}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
							<Controller
								name="accessToken"
								control={control}
								defaultValue={"accessToken" in defaults ? defaults.accessToken : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t(
											"pages.notifications.form.jasminSms.optionAuthorization"
										)}
										placeholder={t(
											"pages.notifications.form.jasminSms.placeholderAuthorization"
										)}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
							<Controller
								name="jasminFrom"
								control={control}
								defaultValue={"jasminFrom" in defaults ? defaults.jasminFrom : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t("pages.notifications.form.jasminSms.optionFrom")}
										placeholder={t("pages.notifications.form.jasminSms.placeholderFrom")}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
							<Controller
								name="phone"
								control={control}
								defaultValue={"phone" in defaults ? defaults.phone : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t("pages.notifications.form.jasminSms.optionRecipients")}
										placeholder={t(
											"pages.notifications.form.jasminSms.placeholderRecipients"
										)}
										fullWidth
										multiline
										minRows={3}
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
							<Controller
								name="jasminAccountId"
								control={control}
								defaultValue={
									"jasminAccountId" in defaults ? defaults.jasminAccountId : ""
								}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t("pages.notifications.form.jasminSms.optionAccountId")}
										placeholder={t(
											"pages.notifications.form.jasminSms.placeholderAccountId"
										)}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
							<Controller
								name="jasminReportId"
								control={control}
								defaultValue={"jasminReportId" in defaults ? defaults.jasminReportId : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t("pages.notifications.form.jasminSms.optionReportId")}
										placeholder={t(
											"pages.notifications.form.jasminSms.placeholderReportId"
										)}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
							<Controller
								name="jasminDlrEnabled"
								control={control}
								defaultValue={
									"jasminDlrEnabled" in defaults ? defaults.jasminDlrEnabled : false
								}
								render={({ field }) => (
									<Stack
										direction="row"
										alignItems="center"
										spacing={theme.spacing(4)}
									>
										<SwitchComponent
											checked={field.value ?? false}
											onChange={(event) => field.onChange(event.target.checked)}
										/>
										<Typography>
											{t("pages.notifications.form.jasminSms.optionDlrEnabled")}
										</Typography>
									</Stack>
								)}
							/>
							{watchedJasminDlrEnabled && (
								<>
									<Controller
										name="jasminDlrMethod"
										control={control}
										defaultValue={
											"jasminDlrMethod" in defaults ? defaults.jasminDlrMethod : "POST"
										}
										render={({ field, fieldState }) => (
											<Select
												value={field.value}
												fieldLabel={t(
													"pages.notifications.form.jasminSms.optionDlrMethod"
												)}
												error={!!fieldState.error}
												onChange={field.onChange}
											>
												{JasminDlrMethods.map((method) => (
													<MenuItem
														key={method}
														value={method}
													>
														<Typography>{method}</Typography>
													</MenuItem>
												))}
											</Select>
										)}
									/>
									<Controller
										name="jasminDlrUrl"
										control={control}
										defaultValue={"jasminDlrUrl" in defaults ? defaults.jasminDlrUrl : ""}
										render={({ field, fieldState }) => (
											<TextField
												{...field}
												type="text"
												fieldLabel={t("pages.notifications.form.jasminSms.optionDlrUrl")}
												placeholder={t(
													"pages.notifications.form.jasminSms.placeholderDlrUrl"
												)}
												fullWidth
												error={!!fieldState.error}
												helperText={fieldState.error?.message ?? ""}
											/>
										)}
									/>
									<Controller
										name="jasminDlrLevel"
										control={control}
										defaultValue={
											"jasminDlrLevel" in defaults ? defaults.jasminDlrLevel : 2
										}
										render={({ field, fieldState }) => (
											<TextField
												name={field.name}
												value={field.value ?? ""}
												onBlur={field.onBlur}
												inputRef={field.ref}
												onChange={(event) => {
													const value = event.target.value;
													field.onChange(value === "" ? undefined : Number(value));
												}}
												type="number"
												fieldLabel={t(
													"pages.notifications.form.jasminSms.optionDlrLevel"
												)}
												placeholder={t(
													"pages.notifications.form.jasminSms.placeholderDlrLevel"
												)}
												fullWidth
												error={!!fieldState.error}
												helperText={fieldState.error?.message ?? ""}
											/>
										)}
									/>
								</>
							)}
						</Stack>
					}
				/>
			)}
			{watchedType === "ntfy" && (
				<ConfigBox
					title={t("pages.notifications.form.ntfy.title")}
					subtitle={t("pages.notifications.form.ntfy.description")}
					rightContent={
						<Stack spacing={theme.spacing(8)}>
							<Controller
								name="address"
								control={control}
								defaultValue={"address" in defaults ? defaults.address : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t("pages.notifications.form.ntfy.optionServerUrl")}
										placeholder={t("pages.notifications.form.ntfy.placeholderServerUrl")}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
							<Controller
								name="topic"
								control={control}
								defaultValue={"topic" in defaults ? defaults.topic : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t("pages.notifications.form.ntfy.optionTopic")}
										placeholder={t("pages.notifications.form.ntfy.placeholderTopic")}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
						</Stack>
					}
				/>
			)}
			{watchedType === "telegram" && (
				<ConfigBox
					title={t("pages.notifications.form.telegram.title")}
					subtitle={t("pages.notifications.form.telegram.description")}
					rightContent={
						<Stack spacing={theme.spacing(8)}>
							<Controller
								name="accessToken"
								control={control}
								defaultValue={"accessToken" in defaults ? defaults.accessToken : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t("pages.notifications.form.telegram.optionBotToken")}
										placeholder={t(
											"pages.notifications.form.telegram.placeholderBotToken"
										)}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
							<Controller
								name="address"
								control={control}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t("pages.notifications.form.telegram.optionChatId")}
										placeholder={t("pages.notifications.form.telegram.placeholderChatId")}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
						</Stack>
					}
				/>
			)}
			{watchedType === "pushover" && (
				<ConfigBox
					title={t("pages.notifications.form.pushover.title")}
					subtitle={t("pages.notifications.form.pushover.description")}
					rightContent={
						<Stack spacing={theme.spacing(8)}>
							<Controller
								name="accessToken"
								control={control}
								defaultValue={"accessToken" in defaults ? defaults.accessToken : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t("pages.notifications.form.pushover.optionAppToken")}
										placeholder={t(
											"pages.notifications.form.pushover.placeholderAppToken"
										)}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
							<Controller
								name="address"
								control={control}
								defaultValue={"address" in defaults ? defaults.address : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t("pages.notifications.form.pushover.optionUserKey")}
										placeholder={t(
											"pages.notifications.form.pushover.placeholderUserKey"
										)}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
						</Stack>
					}
				/>
			)}
			{watchedType === "twilio" && (
				<ConfigBox
					title={t("pages.notifications.form.twilio.title")}
					subtitle={t("pages.notifications.form.twilio.description")}
					rightContent={
						<Stack spacing={theme.spacing(8)}>
							<Controller
								name="accountSid"
								control={control}
								defaultValue={"accountSid" in defaults ? defaults.accountSid : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t("pages.notifications.form.twilio.optionAccountSid")}
										placeholder={t(
											"pages.notifications.form.twilio.placeholderAccountSid"
										)}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
							<Controller
								name="accessToken"
								control={control}
								defaultValue={"accessToken" in defaults ? defaults.accessToken : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t("pages.notifications.form.twilio.optionAuthToken")}
										placeholder={t(
											"pages.notifications.form.twilio.placeholderAuthToken"
										)}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
							<Controller
								name="twilioPhoneNumber"
								control={control}
								defaultValue={
									"twilioPhoneNumber" in defaults ? defaults.twilioPhoneNumber : ""
								}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t("pages.notifications.form.twilio.optionFromNumber")}
										placeholder={t(
											"pages.notifications.form.twilio.placeholderFromNumber"
										)}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
							<Controller
								name="phone"
								control={control}
								defaultValue={"phone" in defaults ? defaults.phone : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t("pages.notifications.form.twilio.optionToNumber")}
										placeholder={t("pages.notifications.form.twilio.placeholderToNumber")}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
						</Stack>
					}
				/>
			)}
			{watchedType === "matrix" && (
				<ConfigBox
					title={t("pages.notifications.form.matrix.title")}
					subtitle={t("pages.notifications.form.matrix.description")}
					rightContent={
						<Stack spacing={theme.spacing(8)}>
							<Controller
								name="homeserverUrl"
								control={control}
								defaultValue={"homeserverUrl" in defaults ? defaults.homeserverUrl : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t("pages.notifications.form.homeServer.optionHomeServer")}
										placeholder={t("pages.notifications.form.homeServer.placeholder")}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
							<Controller
								name="roomId"
								control={control}
								defaultValue={"roomId" in defaults ? defaults.roomId : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t("pages.notifications.form.roomId.optionRoomId")}
										placeholder={t("pages.notifications.form.roomId.placeholder")}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
							<Controller
								name="accessToken"
								control={control}
								defaultValue={"accessToken" in defaults ? defaults.accessToken : ""}
								render={({ field, fieldState }) => (
									<TextField
										{...field}
										type="text"
										fieldLabel={t(
											"pages.notifications.form.accessToken.optionAccessToken"
										)}
										placeholder={t("pages.notifications.form.accessToken.placeholder")}
										fullWidth
										error={!!fieldState.error}
										helperText={fieldState.error?.message ?? ""}
									/>
								)}
							/>
						</Stack>
					}
				/>
			)}
			<Stack
				direction="row"
				justifyContent="flex-end"
				spacing={theme.spacing(2)}
			>
				<Button
					variant="contained"
					color="primary"
					onClick={handleTest}
					loading={isTesting}
				>
					{t("common.buttons.test")}
				</Button>
				<Button
					loading={isSubmitting || isPatching}
					type="submit"
					variant="contained"
					color="primary"
				>
					{t("common.buttons.save")}
				</Button>
			</Stack>
		</BasePage>
	);
};

export default NotificationsCreatePage;
