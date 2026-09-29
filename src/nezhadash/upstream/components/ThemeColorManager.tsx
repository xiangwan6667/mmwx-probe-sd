"use client";
// MMWX adaptation: resolve system colors through the host; see licenses/NezhaDash-NOTICE.md.

import { useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";
import { systemColorScheme } from "../../../theme-settings";

export function ThemeColorManager() {
	const { theme } = useTheme();

	useEffect(() => {
		const updateThemeColor = () => {
			const currentTheme =
				theme === "system"
					? systemColorScheme().matches
						? "dark"
						: "light"
					: theme;
			const meta = document.querySelector('meta[name="theme-color"]');

			if (!meta) {
				const newMeta = document.createElement("meta");
				newMeta.name = "theme-color";
				document.head.appendChild(newMeta);
			}

			const themeColor =
				currentTheme === "dark"
					? "hsl(30 15% 8%)" // 深色模式背景色
					: "hsl(0 0% 98%)"; // 浅色模式背景色

			document
				.querySelector('meta[name="theme-color"]')
				?.setAttribute("content", themeColor);
		};

		// Update on mount and theme change
		updateThemeColor();

		// Listen for system theme changes
		const mediaQuery = systemColorScheme();
		mediaQuery.addEventListener("change", updateThemeColor);

		return () => mediaQuery.removeEventListener("change", updateThemeColor);
	}, [theme]);

	return null;
}
