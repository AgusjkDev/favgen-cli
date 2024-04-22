import generate from "@/generate";
import {
    exit,
    getFavicons,
    getInputPath,
    getOptimizeSvg,
    getOutputPath,
    getPwaConfig,
    title,
} from "@/prompts";
import { isSvg } from "@/utils";

import PKG from "../package.json";

async function main() {
    title(PKG.name);

    const inputPath = await getInputPath();
    const outputPath = await getOutputPath();
    const favicons = await getFavicons();
    const pwaConfig = await getPwaConfig();
    const optimizeSvg = isSvg(inputPath) && (await getOptimizeSvg());

    await generate({ inputPath, outputPath, favicons, pwaConfig, optimizeSvg });

    exit(0, `Done! Thank you for using ${PKG.name} :)`);
}

main().catch(console.error);
