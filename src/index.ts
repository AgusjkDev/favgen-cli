import { intro, outro, spinner } from "@clack/prompts";

import generate from "@/generate";
import { getFavicons, getInputPath, getOptimizeSvg, getOutputPath, getPwaConfig } from "@/prompts";
import { isSvg } from "@/utils";

import PKG from "../package.json";

async function main() {
    intro(` ${PKG.name} `);

    const inputPath = await getInputPath();
    const outputPath = await getOutputPath();
    const favicons = await getFavicons();
    const pwaConfig = await getPwaConfig();
    const optimizeSvg = isSvg(inputPath) && (await getOptimizeSvg());

    const s = spinner();
    s.start("Generating");

    await generate({ inputPath, outputPath, favicons, pwaConfig, optimizeSvg });

    s.stop("Successfully generated.");

    outro(`Done! Thank you for using ${PKG.name} :)`);
}

main().catch(console.error);
