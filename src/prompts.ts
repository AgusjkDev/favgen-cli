import fs from "node:fs";
import path from "node:path";
import { group, isCancel, multiselect, outro, select, text } from "@clack/prompts";

import {
    PWA_DESCRIPTION_MAX_LENGTH,
    PWA_DISPLAY_MODES,
    PWA_NAME_MAX_LENGTH,
    VALID_FILETYPES,
} from "@/constants";
import { FAVICON_OPTIONS, type FaviconOption, type FaviconOptionValue } from "@/generate";
import { isHexColor, toAbsPath } from "@/utils";

export function exit(code: number = 0, message: string = "No problem! See you next time :)") {
    outro(message);

    return process.exit(code);
}

export async function getInputPath() {
    let inputPath = "";
    let notEnoughPermissions = false;

    const cancel = await text({
        message: "Where is the source image located at?",
        placeholder: path.join(import.meta.dir, "/"),
        validate: value => {
            inputPath = toAbsPath(value);

            if (!fs.existsSync(inputPath)) {
                return `Input path "${inputPath}" does not exist or is not a file.`;
            }

            if (!fs.statSync(inputPath).isFile()) {
                return `Input path "${inputPath}" is not a file.`;
            }

            if (!VALID_FILETYPES.includes(path.extname(inputPath))) {
                return `Filetype not supported. Accepted filetypes: ${VALID_FILETYPES.join(",")}.`;
            }

            try {
                fs.accessSync(inputPath);
            } catch (_) {
                notEnoughPermissions = true;
            }
        },
    });
    if (isCancel(cancel)) return exit();

    if (notEnoughPermissions) {
        return exit(
            126,
            `Not enough permissions to access source image input path "${inputPath}".`,
        );
    }

    return inputPath;
}

export async function getOutputPath() {
    let outputPath = "";
    let notEnoughPermissions = false;
    let failedDirCreation = false;

    const cancel = await text({
        message: "Where should we save the favicons package?",
        placeholder: import.meta.dir,
        initialValue: import.meta.dir,
        defaultValue: import.meta.dir,
        validate: value => {
            outputPath = toAbsPath(value);

            if (fs.existsSync(outputPath)) {
                try {
                    fs.accessSync(outputPath);
                } catch (_) {
                    notEnoughPermissions = true;
                }
                return;
            }

            try {
                fs.mkdirSync(outputPath, { recursive: true });
            } catch (_) {
                failedDirCreation = true;
            }
        },
    });
    if (isCancel(cancel)) return exit();

    if (notEnoughPermissions) {
        return exit(126, `Not enough permissions to access output path "${outputPath}".`);
    }

    if (failedDirCreation) {
        return exit(1, `There was an error trying to create output path "${outputPath}".`);
    }

    return outputPath;
}

export async function getFavicons() {
    const favicons = await multiselect<FaviconOption[], FaviconOptionValue>({
        message: "Select any extra favicon categories (optional)",
        required: false,
        options: FAVICON_OPTIONS,
    });

    if (isCancel(favicons)) return exit();

    return favicons;
}

export type PwaConfig = Exclude<Awaited<ReturnType<typeof getPwaConfig>>, null>;
export async function getPwaConfig() {
    const configurePwa = await select({
        message: "Do you want to configure Progressive Web App?",
        initialValue: false,
        options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
        ],
    });
    if (isCancel(configurePwa)) return exit();

    if (!configurePwa) return null;

    return await group(
        {
            name: () =>
                text({
                    message: "How is the app called?",
                    placeholder: "My App",
                    validate: value => {
                        if (!value) {
                            return "Please provide the app name.";
                        }

                        if (value.length > PWA_NAME_MAX_LENGTH) {
                            return `The app name must not have more than ${PWA_NAME_MAX_LENGTH} characters.`;
                        }
                    },
                }),
            description: () =>
                text({
                    message: `Provide the app description`,
                    placeholder: `Your app description.`,
                    validate: value => {
                        if (!value) {
                            return "Please provide the app description";
                        }

                        if (value.length > PWA_DESCRIPTION_MAX_LENGTH) {
                            return `The app description must not have more than ${PWA_NAME_MAX_LENGTH} characters.`;
                        }
                    },
                }),
            display: () =>
                select({
                    message: `Select the app display mode`,
                    initialValue: PWA_DISPLAY_MODES[0],
                    options: PWA_DISPLAY_MODES.map(mode => ({
                        label: mode,
                        value: mode,
                        hint: mode === PWA_DISPLAY_MODES[0] ? "most used" : undefined,
                    })),
                }),
            color: () =>
                text({
                    message: `Provide the app theme hex color for the tool bar and splash screen`,
                    placeholder: "#ffffff",
                    initialValue: "#ffffff",
                    validate: value => {
                        if (!value) {
                            return "Please provide the app theme hex color.";
                        }

                        if (!isHexColor(value)) {
                            return `"${value}" is not a valid color hex code.`;
                        }
                    },
                }),
        },
        {
            onCancel: () => exit(),
        },
    );
}

export async function getSvgOptimize() {
    const svgOptimize = await select({
        message: "Do you want us to optimize your svg?",
        initialValue: true,
        options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
        ],
    });
    if (isCancel(svgOptimize)) return exit();

    return svgOptimize;
}
