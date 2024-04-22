import fs from "node:fs";
import path from "node:path";
import { group, intro, isCancel, multiselect, outro, select, spinner, text } from "@clack/prompts";

import {
    PWA_DESCRIPTION_MAX_LENGTH,
    PWA_DISPLAY_MODES,
    PWA_NAME_MAX_LENGTH,
    VALID_FILETYPES,
} from "@/constants";
import generate, { FAVICON_OPTIONS, type FaviconOption, type FaviconOptionValue } from "@/generate";
import { isHexColor, toAbsPath } from "@/utils";

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
    if (isCancel(input)) return exit();

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
    if (isCancel(output)) return exit();

    const outputPath = toAbsPath(output.toString());
    if (notEnoughPermissions) {
        return exit(126, `Not enough permissions to access output path "${outputPath}".`);
    }
    if (failedDirCreation) {
        return exit(
            1,
            `There was an unexpected error trying to create output path "${outputPath}".`,
        );
    }

    const faviconOptions = await multiselect<FaviconOption[], FaviconOptionValue>({
        message: "Select any extra favicon categories (optional)",
        required: false,
        options: FAVICON_OPTIONS,
    });
    if (isCancel(faviconOptions)) return exit();

    const isPwa = await select({
        message: "Do you want to configure Progressive Web App?",
        initialValue: false,
        options: [
            { label: "Yes", value: true },
            { label: "No", value: false },
        ],
    });
    if (isCancel(isPwa)) return exit();

    const pwaConfig = !isPwa
        ? null
        : await group(
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

    const optimizeSvg =
        path.extname(inputPath) === ".svg" &&
        (await select({
            message: "Do you want us to optimize your svg?",
            initialValue: true,
            options: [
                { label: "Yes", value: true },
                { label: "No", value: false },
            ],
        }));

    if (isCancel(optimizeSvg)) return exit();

    const s = spinner();
    s.start("Generating");

    await generate(inputPath, outputPath, faviconOptions, {
        optimizeSvg,
        pwaConfig,
    });

    s.stop("Successfully generated.");

    outro(`Done! Thank you for using ${PKG.name} :)`);
}

main().catch(console.error);
