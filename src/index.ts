import fs from "node:fs";
import path from "node:path";
import { intro, isCancel, multiselect, outro, spinner, text } from "@clack/prompts";

import { VALID_FILETYPES } from "@/constants";
import generate, { FAVICON_OPTIONS, type FaviconOption, type FaviconOptionValue } from "@/generate";
import { toAbsPath } from "@/utils";

import PKG from "../package.json";

function exit(code: number = 0, message: string = "No problem! See you next time :)") {
    outro(message);

    return process.exit(code);
}

async function main() {
    intro(` ${PKG.name} `);

    let notEnoughPermissions = false;
    const input = await text({
        message: "Where is the source image located at?",
        placeholder: path.join(import.meta.dir, "/"),
        validate: value => {
            const absPath = toAbsPath(value);
            if (!fs.existsSync(absPath)) {
                return `Input path "${absPath}" does not exist or is not a file.`;
            }

            const stat = fs.statSync(absPath);
            if (!stat.isFile()) {
                return `Input path "${absPath}" is not a file.`;
            }

            if (!VALID_FILETYPES.includes(path.extname(absPath))) {
                return `Filetype not supported. Accepted filetypes: ${VALID_FILETYPES.join(",")}.`;
            }

            try {
                fs.accessSync(absPath);
            } catch (_) {
                notEnoughPermissions = true;
            }
        },
    });
    if (isCancel(input)) exit();

    const inputPath = toAbsPath(input.toString());
    if (notEnoughPermissions) {
        exit(126, `Not enough permissions to access source image input path "${inputPath}".`);
    }

    notEnoughPermissions = false;
    let failedDirCreation = false;
    const output = await text({
        message: "Where should we save the favicons package?",
        placeholder: import.meta.dir,
        initialValue: import.meta.dir,
        defaultValue: import.meta.dir,
        validate: value => {
            const absPath = toAbsPath(value);

            if (fs.existsSync(absPath)) {
                try {
                    fs.accessSync(absPath);
                } catch (_) {
                    notEnoughPermissions = true;
                }
            } else {
                try {
                    fs.mkdirSync(absPath, { recursive: true });
                } catch (_) {
                    failedDirCreation = true;
                }
            }
        },
    });
    if (isCancel(output)) exit();

    const outputPath = toAbsPath(output.toString());
    if (notEnoughPermissions) {
        exit(126, `Not enough permissions to access output path "${outputPath}".`);
    }
    if (failedDirCreation) {
        exit(1, `There was an unexpected error trying to create output path "${outputPath}".`);
    }

    const faviconOptions = await multiselect<FaviconOption[], FaviconOptionValue>({
        message: "Select any extra favicon categories (optional)",
        required: false,
        options: FAVICON_OPTIONS,
    });
    if (isCancel(faviconOptions) || faviconOptions instanceof Symbol) {
        return exit();
    }

    const s = spinner();
    s.start("Generating");

    await generate(inputPath, outputPath, faviconOptions);

    s.stop("Successfully generated.");

    outro(`Done! Thank you for using ${PKG.name} :)`);
}

main().catch(console.error);
