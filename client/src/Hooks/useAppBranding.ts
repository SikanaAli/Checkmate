import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useGet } from "@/Hooks/UseApi";
import type { AppSettingsResponse } from "@/Types/Settings";

const DEFAULT_APP_NAME = "Checkmate";
const DEFAULT_FAVICON = "/checkmate_favicon.svg";

const setFavicon = (href: string) => {
	const existing = document.querySelector<HTMLLinkElement>("link[rel='icon']");
	const link = existing ?? document.createElement("link");
	link.rel = "icon";
	link.href = href;
	if (!existing) {
		document.head.appendChild(link);
	}
};

export const useAppBranding = () => {
	const { t } = useTranslation();
	const { data } = useGet<AppSettingsResponse>("/settings", undefined, {
		revalidateOnFocus: false,
		shouldRetryOnError: false,
	});

	const appName = data?.settings?.appName || t("common.appName") || DEFAULT_APP_NAME;
	const appLogo = data?.settings?.appLogo || "";

	useEffect(() => {
		document.title = appName;
		setFavicon(appLogo || DEFAULT_FAVICON);
	}, [appLogo, appName]);

	return useMemo(
		() => ({
			appName,
			appLogo,
		}),
		[appLogo, appName]
	);
};
