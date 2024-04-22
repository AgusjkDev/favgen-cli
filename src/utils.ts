import path from "node:path";

export function toAbsPath(input: string) {
    return path.isAbsolute(input) ? path.normalize(input) : path.join(process.cwd(), input);
}

export function isHexColor(input: string) {
    return input.match(/^#?([a-f0-9]{6}|[a-f0-9]{3})$/i);
}

export function isSvg(input: string) {
    return path.extname(input) === ".svg";
}
