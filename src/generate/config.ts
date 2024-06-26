import type { FaviconData, FaviconRel } from "@/generate";
import type { PwaConfig } from "@/prompts";

export function getBrowserConfig() {
    return `
<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square70x70logo src="favicon-128x128.png" />
            <square150x150logo src="favicon-270x270.png" />
            <wide310x150logo src="favicon-558x270.png" />
            <square310x310logo src="favicon-558x558.png" />
        </tile>
    </msapplication>
</browserconfig>`.trim();
}

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
        sizes: "512x512",
        type: "image/svg+xml",
    };
    const pngIcons = sortedFaviconsData.map(({ src, proportions }) => ({
        src,
        sizes: proportions,
        type: "image/png",
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

export function getExampleHtml({
    pwaConfig,
    faviconsData,
    withSvgIcon,
}: {
    pwaConfig: PwaConfig | null;
    faviconsData: (FaviconData & { rel: FaviconRel })[];
    withSvgIcon: boolean;
}) {
    // Sort by rel and size descending
    const sortedFaviconsData = faviconsData.toSorted((a, b) => {
        if (a.rel === "apple-touch-icon" && b.rel === "icon") {
            return -1;
        }
        if (a.rel === "icon" && b.rel === "apple-touch-icon") {
            return 1;
        }

        return (
            (Array.isArray(b.size) ? b.size[0] : b.size)! -
            (Array.isArray(a.size) ? a.size[0] : a.size)!
        );
    });

    const tags = [
        `<title>${pwaConfig?.name ?? "Your app"}</title>`,
        ...(pwaConfig
            ? [
                  `<meta name="description" content="${pwaConfig.description}" />`,
                  `<meta name="theme-color" content="${pwaConfig.color}" />`,
                  '<link rel="manifest" href="/manifest.json" />',
              ]
            : []),
        ...sortedFaviconsData.map(
            ({ rel, src, proportions }) =>
                `<link rel="${rel}" href="/${src}" sizes="${proportions}" type="image/png" />`,
        ),
        ...(withSvgIcon
            ? [`<link rel="icon" href="/favicon.svg" sizes="any" type="image/svg+xml" />`]
            : []),
        '<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 64x64" type="image/x-icon" />',
    ];

    return `
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        ${tags.join("\n\t\t")}
    </head>
    <body></body>
</html>`.trim();
}
