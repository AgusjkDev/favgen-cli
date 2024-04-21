import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import archiver, { type Archiver } from "archiver";
import sharp from "sharp";
import svgo from "svgo";
import toIco from "to-ico";

import { PNG_COMPRESSION_LEVEL, ZIP_COMPRESSION_LEVEL, ZIP_PACKAGE_FILENAME } from "@/constants";

export type FaviconOptionValue = {
    sizes: (number | number[])[];
    configFile?: (archive: Archiver) => void;
};
export type FaviconOption = {
    label: string;
    value: FaviconOptionValue;
};
type PwaConfig = {
    name: string;
    description: string;
    display: string;
    color: string;
};
const DEFAULT_FAVICON_SIZES: FaviconOptionValue["sizes"] = [16, 32, 64];
const PWA_FAVICON_SIZES: FaviconOptionValue["sizes"] = [192, 512];
export const FAVICON_OPTIONS: FaviconOption[] = [
    {
        label: "Apple related",
        value: {
            sizes: [57, 60, 72, 76, 114, 120, 144, 152, 167, 180],
        },
    },
    {
        label: "Google & Chrome related",
        value: {
            sizes: [96, 128, 196, 256, 384],
        },
    },
    {
        label: "Internet Explorer",
        value: {
            sizes: [24, 144],
        },
    },
    {
        label: "Windows 8.1",
        value: {
            sizes: [128, 270, 558, [558, 270]],
            configFile: archive => {
                const browserConfigXml = `
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

                archive.append(browserConfigXml, {
                    name: "browserconfig.xml",
                });
            },
        },
    },
];

export default async function generate(
    inputPath: string,
    outputPath: string,
    favicons: FaviconOptionValue[],
    {
        optimizeSvg,
        pwaConfig,
    }: {
        optimizeSvg: boolean;
        pwaConfig: PwaConfig | null;
    },
) {
    const archive = archiver("zip", { zlib: { level: ZIP_COMPRESSION_LEVEL } });
    archive.pipe(createWriteStream(path.join(outputPath, ZIP_PACKAGE_FILENAME)));

    const sizes = Array.from(
        new Set(
            favicons
                .map(({ sizes, configFile }) => {
                    // Since we are mapping over only the sizes, generate the configFile on the fly
                    if (configFile) configFile(archive);

                    return sizes;
                })
                .flat(1),
        ),
    );

    sizes.push(...DEFAULT_FAVICON_SIZES);
    if (pwaConfig) sizes.push(...PWA_FAVICON_SIZES);
    sizes.sort((a, b) => (Array.isArray(a) ? a[0] : a)! - (Array.isArray(b) ? b[0] : b)!);

    const rawBuffer = sharp(inputPath);
    const faviconsData = await Promise.all(
        sizes.map(async size => {
            const isArray = Array.isArray(size);

            return {
                buffer: await rawBuffer
                    .resize({
                        width: isArray ? size[0] : size,
                        height: isArray ? size[1] : size,
                        background: { r: 0, g: 0, b: 0, alpha: 0 },
                        fit: isArray ? sharp.fit.contain : sharp.fit.cover,
                    })
                    .png({ compressionLevel: PNG_COMPRESSION_LEVEL })
                    .toBuffer(),
                size,
            };
        }),
    );

    let icoBuffers: Buffer[] = [];
    for (const { buffer, size } of faviconsData) {
        const isArray = Array.isArray(size);
        if (!Array.isArray(size) && DEFAULT_FAVICON_SIZES.includes(size)) icoBuffers.push(buffer);

        archive.append(buffer, {
            name: `favicon-${isArray ? size[0] : size}x${isArray ? size[1] : size}.png`,
        });
    }

    archive.append(await toIco(icoBuffers), { name: "favicon.ico" });

    const isSvg = path.extname(inputPath) === ".svg";
    if (isSvg) {
        const svgBuffer = await fs.readFile(inputPath);

        let data: Buffer | string = svgBuffer;
        if (optimizeSvg) {
            data = svgo.optimize(svgBuffer.toString("utf-8"), {
                multipass: true,
            }).data;
        }
        archive.append(data, { name: "favicon.svg" });
    }

    if (pwaConfig) {
        const { color, ...config } = pwaConfig;
        const manifest = {
            ...config,
            background_color: color,
            theme_color: color,
            icons: [
                ...(isSvg
                    ? [
                          {
                              src: "favicon.svg",
                              type: "image/svg+xml",
                              sizes: "512x512",
                          },
                      ]
                    : []),
                ...(sizes.filter(size => !Array.isArray(size)) as number[]).map(size => {
                    const proportions = `${size}x${size}`;

                    return {
                        src: `favicon-${proportions}.png`,
                        type: "image/png",
                        sizes: proportions,
                    };
                }),
            ],
        };

        archive.append(JSON.stringify(manifest, null, 4), { name: "manifest.json" });
    }

    await archive.finalize();
}
