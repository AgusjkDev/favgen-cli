import { getBrowserConfig } from "./config";
import type { FaviconOption, FaviconOptionValue } from "./types";

export const DEFAULT_FAVICONS: FaviconOptionValue = { rel: "icon", sizes: [16, 32, 64] };

export const PWA_FAVICONS: FaviconOptionValue = { rel: null, sizes: [192, 512] };

export const FAVICON_OPTIONS: FaviconOption[] = [
    {
        label: "Apple related",
        value: {
            rel: "apple-touch-icon",
            sizes: [57, 60, 72, 76, 114, 120, 144, 152, 167, 180],
        },
    },
    {
        label: "Google & Chrome related",
        value: {
            rel: "icon",
            sizes: [96, 128, 196, 256, 384],
        },
    },
    {
        label: "Internet Explorer",
        value: {
            rel: "icon",
            sizes: [24],
        },
    },
    {
        label: "Windows 8.1",
        value: {
            rel: null,
            sizes: [128, 270, 558, [558, 270]],
            configFile: archive => {
                archive.append(getBrowserConfig(), { name: "browserconfig.xml" });
            },
        },
    },
];
