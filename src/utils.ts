import path from "node:path";

export function toAbsPath(input: string) {
    return path.isAbsolute(input) ? path.normalize(input) : path.join(import.meta.dir, input);
}

export function isHexColor(input: string) {
    return input.match(/^#?([a-f0-9]{6}|[a-f0-9]{3})$/i);
}
