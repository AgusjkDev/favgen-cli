import type { Archiver } from "archiver";

import type { PwaConfig } from "@/utils";

export type FaviconOptionValueSize = number | number[];
export type FaviconOptionValue = {
    rel: "apple-touch-icon" | "icon" | null;
    sizes: FaviconOptionValueSize[];
    configFile?: (archive: Archiver) => void;
};
export type FaviconOption = {
    label: string;
    value: FaviconOptionValue;
};

export type GenerateOptions = {
    optimizeSvg: boolean;
    pwaConfig: PwaConfig | null;
};

export type FaviconData = {
    rel: FaviconOptionValue["rel"];
    size: FaviconOptionValueSize;
    proportions: string;
    src: string;
    buffer: Buffer;
};
