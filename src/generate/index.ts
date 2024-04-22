import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import archiver from "archiver";
import sharp from "sharp";
import svgo from "svgo";
import toIco from "to-ico";

import { PNG_COMPRESSION_LEVEL, ZIP_COMPRESSION_LEVEL, ZIP_PACKAGE_FILENAME } from "@/constants";
import { getBrowserConfig, getExampleHtml, getWebManifest } from "@/utils";

import type { FaviconOption, FaviconOptionValue, GenerateOptions } from "./types";

export * from "./types";

const DEFAULT_FAVICONS: FaviconOptionValue = { rel: "icon", sizes: [16, 32, 64] };
const PWA_FAVICONS: FaviconOptionValue = { rel: null, sizes: [192, 512] };
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

export default async function generate(
    inputPath: string,
    outputPath: string,
    favicons: FaviconOptionValue[],
    { optimizeSvg, pwaConfig }: GenerateOptions,
) {
    const archive = archiver("zip", { zlib: { level: ZIP_COMPRESSION_LEVEL } });
    archive.pipe(createWriteStream(path.join(outputPath, ZIP_PACKAGE_FILENAME)));

    const sharpImage = sharp(inputPath);
    const faviconsData = (
        await Promise.all(
            [DEFAULT_FAVICONS, ...favicons, ...(pwaConfig ? [PWA_FAVICONS] : [])].map(
                async ({ rel, sizes, configFile }) => {
                    // Generate the configFile on the fly
                    if (configFile) configFile(archive);

                    return await Promise.all(
                        sizes.map(async size => {
                            const isArray = Array.isArray(size);
                            const width = isArray ? size[0] : size;
                            const height = isArray ? size[1] : size;
                            const proportions = `${width}x${height}`;
                            const src = `favicon-${proportions}.png`;

                            const buffer = await sharpImage
                                .resize({
                                    width,
                                    height,
                                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                                    fit: isArray ? sharp.fit.contain : sharp.fit.cover,
                                })
                                .png({ compressionLevel: PNG_COMPRESSION_LEVEL })
                                .toBuffer();

                            return { rel, size, proportions, src, buffer };
                        }),
                    );
                },
            ),
        )
    ).flat(1);

    let toIcoBuffers: Buffer[] = [];
    for (const { size, src, buffer } of faviconsData) {
        if (DEFAULT_FAVICONS.sizes.includes(size)) toIcoBuffers.push(buffer);

        archive.append(buffer, { name: src });
    }

    archive.append(await toIco(toIcoBuffers), { name: "favicon.ico" });

    const isSvg = path.extname(inputPath) === ".svg";
    if (isSvg) {
        const svgBuffer = await fs.readFile(inputPath);

        let svg: Buffer | string = svgBuffer;
        if (optimizeSvg) {
            svg = svgo.optimize(svgBuffer.toString("utf-8"), { multipass: true }).data;
        }
        archive.append(svg, { name: "favicon.svg" });
    }

    if (pwaConfig) {
        archive.append(getWebManifest({ pwaConfig, faviconsData, withSvgIcon: isSvg }), {
            name: "manifest.json",
        });
    }

    archive.append(
        getExampleHtml({
            pwaConfig,
            faviconsData: faviconsData.filter(data => data.rel != null),
            withSvgIcon: isSvg,
        }),
        { name: "index.html" },
    );

    await archive.finalize();
}
