import { unexpectedErrorHandler } from "./error";

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

export function dirname(path: string): string {
    const index = path.lastIndexOf('/');
    if (index <= 0) {
        return "/";
    }
    return path.substring(0, index);
}

export function filename(path: string): string {
    if (!path.includes("/")) {
        return path;
    }
    return path.substring(path.lastIndexOf('/') + 1 );
}

export function parentdir(path: string): string {
    if (path === "/" || !path.includes("/")) {
        return "/";
    }
    if (path.endsWith("/")) {
        path = path.slice(0, -1);
    }
    return dirname(path);
}

export async function blobToBase64(blob: Blob): Promise<string> {
    return await new Promise<string>(function(resolve, reject) {
        const reader = new FileReader();
        reader.onload = function() {
            const dataURL = (reader.result as string);
            resolve(dataURL.substring(dataURL.indexOf(",") + 1));
        }
        reader.onerror = function () {
            reject(reader.error ? reader.error : new Error("Failed to read file."));
        };
        reader.readAsDataURL(blob);
    });
}

export async function sleep(ms: number) {
    return await new Promise(resolve => setInterval(resolve, ms));
}

export function copyToClipboard(text: string) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(unexpectedErrorHandler("Failed to copy to clipboard"));
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }
}
