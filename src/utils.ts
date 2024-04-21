import path from "node:path";

export function toAbsPath(input: string) {
    return path.isAbsolute(input) ? path.normalize(input) : path.join(import.meta.dir, input);
}
