import path from "node:path";

import type { FaviconData } from "./generate";

export function toAbsPath(input: string) {
    return path.isAbsolute(input) ? path.normalize(input) : path.join(import.meta.dir, input);
}

export function isHexColor(input: string) {
    return input.match(/^#?([a-f0-9]{6}|[a-f0-9]{3})$/i);
}

export function getBrowserConfig() {
    return `
<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square128x128logo src="favicon-128x128.png" />
            <square270x270logo src="favicon-270x270.png" />
            <square558x558logo src="favicon-558x558.png" />
            <wide558x270logo src="favicon-558x270.png" />
        </tile>
    </msapplication>
</browserconfig>`.trim();
}

export type PwaConfig = {
    name: string;
    description: string;
    display: string;
    color: string;
};
export function getWebManifest({
    pwaConfig,
    faviconsData,
    withSvgIcon,
}: {
    pwaConfig: PwaConfig;
    faviconsData: FaviconData[];
    withSvgIcon: boolean;
}) {
    // Sort by size ascending
    const sortedFaviconsData = faviconsData.toSorted(
        ({ size: sizeA }, { size: sizeB }) =>
            (Array.isArray(sizeA) ? sizeA[0] : sizeA)! - (Array.isArray(sizeB) ? sizeB[0] : sizeB)!,
    );

    const svgIcon = withSvgIcon && {
        src: "favicon.svg",
        type: "image/svg+xml",
        sizes: "512x512",
    };
    const pngIcons = sortedFaviconsData.map(({ src, proportions }) => ({
        src,
        type: "image/png",
        sizes: proportions,
    }));

    const { color, ...config } = pwaConfig;
    const manifest = {
        ...config,
        background_color: color,
        theme_color: color,
        icons: svgIcon ? [svgIcon].concat(pngIcons) : pngIcons,
    };

    return JSON.stringify(manifest, null, 4);
}
