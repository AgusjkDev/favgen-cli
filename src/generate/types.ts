import type { Archiver } from "archiver";

import type { PwaConfig } from "@/prompts";

export type FaviconRel = "apple-touch-icon" | "icon";

type FaviconOptionValueSize = number | number[];

export type FaviconOptionValue = {
    rel: FaviconRel | null;
    sizes: FaviconOptionValueSize[];
    configFile?: (archive: Archiver) => void;
};

export type FaviconOption = {
    label: string;
    value: FaviconOptionValue;
};

export type GenerateParams = {
    inputPath: string;
    outputPath: string;
    favicons: FaviconOptionValue[];
    pwaConfig: PwaConfig | null;
    optimizeSvg: boolean;
};

export type FaviconData = {
    rel: FaviconOptionValue["rel"];
    size: FaviconOptionValueSize;
    proportions: string;
    src: string;
    buffer: Buffer;
};
