// MMWX adaptation (2026-09-30): host integration; see licenses/NezhaDash-NOTICE.md.
// MMWX adaptation (2026-09-29): host data/theme/router integration; see licenses/NezhaDash-NOTICE.md.
import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { lazy, Suspense, useEffect, useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Route, HashRouter as Router, Routes } from "react-router-dom";

import { DashCommand } from "./components/DashCommand";
import ErrorBoundary from "./components/ErrorBoundary";
import PrivateAccessGate from "./components/PrivateAccessGate";
import Footer from "./components/Footer";
import Header, { RefreshToast } from "./components/Header";
import { useBackground } from "./hooks/use-background";
import { useTheme } from "./hooks/use-theme";
import { InjectContext } from "./lib/inject";
import { fetchSetting } from "./lib/nezha-api";
import { cn } from "./lib/utils";
import ErrorPage from "./pages/ErrorPage";
import Server from "./pages/Server";
import { RouteSync } from "../RouteSync";
import { hasCustomBackground } from "../background-state";

const NotFound = lazy(() => import("./pages/NotFound"));
const loadServerDetail = () => import("./pages/ServerDetail");
const ServerDetail = lazy(loadServerDetail);

// Route checker component
const RouteChecker: React.FC = () => {
	return <MainApp />;
};

const toError = (error: unknown) => {
	if (!error) return null;
	return error instanceof Error ? error : new Error(String(error));
};

const MainApp: React.FC = () => {
	const { data: settingData, error } = useQuery({
		queryKey: ["setting"],
		queryFn: () => fetchSetting(),
		refetchOnMount: true,
		refetchOnWindowFocus: true,
		retry: false,
	});
	const { i18n } = useTranslation();
	const { setTheme } = useTheme();
	const [isCustomCodeInjected, setIsCustomCodeInjected] = useState(false);
	const { backgroundImage: customBackgroundImage } = useBackground();
	const customMobileBackgroundImage = window.CustomMobileBackgroundImage || undefined;

	// Paint the viewport canvas too: a fixed element alone cannot paint beneath
	// a classic scrollbar's gutter. Keep the same image visible at the page edge.
	useLayoutEffect(() => {
		const root = document.documentElement;
		root.style.setProperty('--nezha-desktop-image', customBackgroundImage ? `url(${JSON.stringify(customBackgroundImage)})` : 'none');
		root.style.setProperty('--nezha-mobile-image', customMobileBackgroundImage ? `url(${JSON.stringify(customMobileBackgroundImage)})` : 'var(--nezha-desktop-image)');
		return () => {
			root.style.removeProperty('--nezha-desktop-image');
			root.style.removeProperty('--nezha-mobile-image');
		};
	}, [customBackgroundImage, customMobileBackgroundImage]);

	useEffect(() => {
		loadServerDetail();
	}, []);

	useEffect(() => {
		if (settingData?.data?.config?.custom_code) {
			InjectContext(settingData?.data?.config?.custom_code);
			setIsCustomCodeInjected(true);
		}
	}, [settingData?.data?.config?.custom_code]);

	// 检测是否强制指定了主题颜色
	const forceTheme =
		// @ts-expect-error ForceTheme is a global variable
		(window.ForceTheme as string) !== "" ? window.ForceTheme : undefined;

	useEffect(() => {
		if (forceTheme === "dark" || forceTheme === "light") {
			setTheme(forceTheme);
		}
	}, [forceTheme, setTheme]);

	const initialBackendError = !settingData ? toError(error) : null;

	if (settingData?.data?.config?.custom_code && !isCustomCodeInjected) {
		return null;
	}

	if (settingData?.data.private_site) return <PrivateAccessGate siteName={settingData.data.config.site_name} siteDesc={settingData.data.config.site_desc} />;
	const hasGlassBackground = hasCustomBackground(customBackgroundImage, customMobileBackgroundImage);

	return (
		<ErrorBoundary>
			{/* 固定定位的背景层 */}
			{customBackgroundImage && (
				<div
					className={cn(
						"nezha-wallpaper fixed inset-0 z-0 bg-cover bg-no-repeat bg-center dark:brightness-75",
						{
							"hidden sm:block": customMobileBackgroundImage,
						},
					)}
					style={{ backgroundImage: `url(${JSON.stringify(customBackgroundImage)})` }}
				/>
			)}
			{customMobileBackgroundImage && (
				<div
					className={cn(
						"nezha-wallpaper fixed inset-0 z-0 bg-cover bg-no-repeat bg-center sm:hidden dark:brightness-75",
					)}
					style={{ backgroundImage: `url(${JSON.stringify(customMobileBackgroundImage)})` }}
				/>
			)}
			<div
				className={cn("nezha-glass-root flex min-h-screen w-full flex-col", {
					"bg-background": !customBackgroundImage && !customMobileBackgroundImage,
					"has-custom-background": hasGlassBackground,
				})}
			>
				<main className="flex z-20 min-h-[calc(100vh-calc(var(--spacing)*16))] flex-1 flex-col gap-4 p-4 md:p-10 md:pt-8">
					<RefreshToast />
					<Header />
					<DashCommand />
					<Routes>
						<Route
							path="/"
							element={<Server />}
						/>
						<Route
							path="/server/:id"
							element={
								<Suspense fallback={null}>
									<ServerDetail />
								</Suspense>
							}
						/>
						<Route path="/error" element={<ErrorPage />} />
						<Route
							path="*"
							element={
								<Suspense fallback={null}>
									<NotFound />
								</Suspense>
							}
						/>
					</Routes>
					<Footer />
				</main>
			</div>
		</ErrorBoundary>
	);
};

// Main App wrapper with router
const App: React.FC = () => {
	return (
		<Router>
			<RouteSync />
			<RouteChecker />
		</Router>
	);
};

export default App;

