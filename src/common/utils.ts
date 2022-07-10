export async function ensurePakoScriptIsLoaded() {
    let pakoScript = document.getElementById("pako-script") as HTMLScriptElement;
    if (pakoScript == null) {
        pakoScript = document.createElement("script");
        pakoScript.id = "pako-script";
        pakoScript.src = "https://cdn.jsdelivr.net/pako/1.0.3/pako.min.js";
        const promise = new Promise(function (resolve, reject) {
            pakoScript.addEventListener("load", resolve);
            pakoScript.addEventListener("error", reject);
        });
        document.head.appendChild(pakoScript);

        // Wait for the script to load
        await promise;
    }
}

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