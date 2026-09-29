// MMWX adaptation: initialize from runtime settings; see licenses/NezhaDash-NOTICE.md.
import { useEffect, useState } from "react";

declare global {
	interface Window {
		CustomBackgroundImage: string;
		CustomMobileBackgroundImage: string;
		ForceShowServices: boolean;
		ForceCardInline: boolean;
		ForceShowMap: boolean;
		ForcePeakCutEnabled: boolean;
		ForceSortType?: string;
		ForceSortOrder?: string;
	}
}

const BACKGROUND_CHANGE_EVENT = "backgroundChange";

export function useBackground() {
	const [backgroundImage, setBackgroundImage] = useState<string | undefined>(
		window.CustomBackgroundImage || undefined,
	);

	useEffect(() => {
		// 监听背景变化
		const handleBackgroundChange = () => {
			setBackgroundImage(window.CustomBackgroundImage || undefined);
		};

		handleBackgroundChange();

		window.addEventListener(BACKGROUND_CHANGE_EVENT, handleBackgroundChange);

		return () => {
			window.removeEventListener(
				BACKGROUND_CHANGE_EVENT,
				handleBackgroundChange,
			);
		};
	}, []);

	const updateBackground = (newBackground: string | undefined) => {
		window.CustomBackgroundImage = newBackground || "";
		window.dispatchEvent(new Event(BACKGROUND_CHANGE_EVENT));
	};

	return { backgroundImage, updateBackground };
}
