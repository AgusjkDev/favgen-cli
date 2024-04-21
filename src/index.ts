import { accessSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { intro, isCancel, outro, text } from "@clack/prompts";

import { VALID_FILETYPES } from "@/constants";
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
            if (!existsSync(absPath)) {
                return `Input path "${absPath}" does not exist or is not a file.`;
            }

            const stat = statSync(absPath);
            if (!stat.isFile()) {
                return `Input path "${absPath}" is not a file.`;
            }

            if (!VALID_FILETYPES.includes(path.extname(absPath))) {
                return `Filetype not supported. Accepted filetypes: ${VALID_FILETYPES.join(",")}.`;
            }

            try {
                accessSync(absPath);
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

            if (existsSync(absPath)) {
                try {
                    accessSync(absPath);
                } catch (_) {
                    notEnoughPermissions = true;
                }
            } else {
                try {
                    mkdirSync(absPath, { recursive: true });
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

    // TODO: generate favicons

    outro(`Done! Thank you for using ${PKG.name} :)`);
}

main().catch(console.error);
