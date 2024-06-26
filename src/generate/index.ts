import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { spinner } from "@clack/prompts";
import archiver from "archiver";
import pngToIco from "png-to-ico";
import sharp from "sharp";
import svgo from "svgo";

import { PNG_COMPRESSION_LEVEL, ZIP_COMPRESSION_LEVEL, ZIP_PACKAGE_FILENAME } from "@/constants";
import { exit } from "@/prompts";
import { isSvg } from "@/utils";

import { getExampleHtml, getWebManifest } from "./config";
import { DEFAULT_FAVICONS, PWA_FAVICONS } from "./data";
import type { FaviconData, FaviconRel, GenerateParams } from "./types";

export * from "./types";

export default function generate({
    inputPath,
    outputPath,
    favicons,
    pwaConfig,
    optimizeSvg,
}: GenerateParams) {
    // https://github.com/archiverjs/node-archiver/issues/555
    return new Promise<void>(async resolve => {
        const s = spinner();
        s.start("Generating");

        try {
            const stream = createWriteStream(path.join(outputPath, ZIP_PACKAGE_FILENAME));

            stream.on("close", () => {
                s.stop("Successfully generated.");

                resolve();
            });

            const archive = archiver("zip", { zlib: { level: ZIP_COMPRESSION_LEVEL } });
            archive.pipe(stream);

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

            archive.append(await pngToIco(toIcoBuffers), { name: "favicon.ico" });

            const withSvgIcon = isSvg(inputPath);
            if (withSvgIcon) {
                const svgBuffer = await fs.readFile(inputPath);

                let svg: Buffer | string = svgBuffer;
                if (optimizeSvg) {
                    svg = svgo.optimize(svgBuffer.toString("utf-8"), { multipass: true }).data;
                }
                archive.append(svg, { name: "favicon.svg" });
            }

            if (pwaConfig) {
                archive.append(getWebManifest({ pwaConfig, faviconsData, withSvgIcon }), {
                    name: "manifest.json",
                });
            }

            archive.append(
                getExampleHtml({
                    pwaConfig,
                    faviconsData: faviconsData.filter(
                        (data): data is FaviconData & { rel: FaviconRel } => data.rel != null,
                    ),
                    withSvgIcon,
                }),
                { name: "index.html" },
            );

            // This will trigger the write stream "close" event.
            await archive.finalize();
        } catch (_) {
            s.stop("Unable to generate.");
            exit(1, "There was an unexpected error while generating the favicons package.");
        }
    });
}
