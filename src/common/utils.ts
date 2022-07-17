export function ensureAbsolute(path: string) {
    if (!path || !path.startsWith("/")) {
        throw new Error("Must be an absolute path, got: " + path);
    }
}

export function joinPath(a: string, b: string) {
    if (b.startsWith("/")) {
        throw new Error("Absolute paths are not allowed in joinPath. a: " + a + ", b: " + b);
    }
    if (!a.endsWith("/")) {
        a += "/";
    }
    return a + b;
}