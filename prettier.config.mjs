/** @type {import("prettier").Config & import("@ianvs/prettier-plugin-sort-imports").PluginConfig} */
const config = {
    arrowParens: "avoid",
    endOfLine: "lf",
    printWidth: 100,
    tabWidth: 4,
    importOrder: ["<THIRD_PARTY_MODULES>", "", "^@/(.*)$", "", "^[./]"],
    importOrderParserPlugins: ["typescript"],
    plugins: ["@ianvs/prettier-plugin-sort-imports"],
};

export default config;
