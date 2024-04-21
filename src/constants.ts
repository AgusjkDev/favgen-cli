import type { Archiver } from "archiver";

export const VALID_FILETYPES = [".avif", ".jpeg", ".jpg", ".png", ".webp"];
export type FaviconOption = {
    label: string;
    value: {
        sizes: (number | number[])[];
        configFile?: (archive: Archiver) => void;
    };
    selected?: true;
};
export const FAVICON_OPTIONS: FaviconOption[] = [
    {
        label: "Standard sizes",
        value: {
            sizes: [16, 32, 64],
        },
        selected: true,
    },
    {
        label: "Apple related",
        value: {
            sizes: [57, 60, 72, 76, 114, 120, 144, 152, 167, 180],
        },
        selected: true,
    },
    {
        label: "Google & Chrome related",
        value: {
            sizes: [96, 128, 196, 256, 384],
        },
        selected: true,
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
export const ZIP_COMPRESSION_LEVEL = 9;
export const ZIP_PACKAGE_FILENAME = "favicons.zip";
export const PNG_COMPRESSION_LEVEL = 9;
