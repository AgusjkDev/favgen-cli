import { createWriteStream } from "node:fs";
import path from "node:path";
import archiver, { type Archiver } from "archiver";
import sharp from "sharp";

import { PNG_COMPRESSION_LEVEL, ZIP_COMPRESSION_LEVEL, ZIP_PACKAGE_FILENAME } from "@/constants";

export type FaviconOptionValue = {
    sizes: (number | number[])[];
    configFile?: (archive: Archiver) => void;
};
export type FaviconOption = {
    label: string;
    value: FaviconOptionValue;
};
const DEFAULT_FAVICON_SIZES: FaviconOptionValue["sizes"] = [16, 32, 64];
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
        label: "Progressive Web Apps",
        value: {
            sizes: [192, 512],
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

    const faviconsData = await Promise.all(
        sizes.map(async size => {
            const isArray = Array.isArray(size);

            return {
                buffer: await sharp(inputPath)
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

    for (const { buffer, size } of faviconsData) {
        const isArray = Array.isArray(size);
        archive.append(buffer, {
            name: `favicon-${isArray ? size[0] : size}x${isArray ? size[1] : size}.png`,
        });
    }

    await archive.finalize();
}
