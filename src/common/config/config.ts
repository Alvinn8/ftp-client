import { EventEmitter } from "eventemitter3";
import { defaultConfig, distributionConfig } from "./defaultConfig";

export type Config = typeof defaultConfig;

let config: Config | null = null;
let emitter = new EventEmitter();

export function getConfig(): Config {
    if (config == null) {
        throw new Error("Config has not been loaded yet.");
    }
    return config;
}

export async function loadConfig(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 5;
    while (attempts < maxAttempts) {
        try {
            const response = await fetch("config.json");
            if (!response.ok || response.status !== 200) {
                throw new Error(
                    `Failed to load config: ${response.statusText}`,
                );
            }
            const json = await response.json();
            config = deepMerge(
                deepMerge(defaultConfig, distributionConfig),
                json,
            );
            applyConfig();
            emitter.emit("load");
            emitter = null;
            return;
        } catch (error) {
            attempts++;
            if (attempts >= maxAttempts) {
                throw new Error(
                    `Failed to load config after ${maxAttempts} attempts.`,
                    { cause: error },
                );
            }
        }
    }
}

function applyConfig() {
    if (config == null) {
        throw new Error("Config has not been loaded yet.");
    }
    document.title = config.branding.title;
    for (const [themeName, theme] of Object.entries(config.themes)) {
        for (const [varName, varValue] of Object.entries(theme)) {
            document.documentElement.style.setProperty(
                `--theme-${themeName}-${varName}`,
                varValue,
            );
        }
    }
}

function deepMerge(target: any, source: any): any {
    for (const key of Object.keys(source)) {
        if (
            source[key] instanceof Object &&
            key in target &&
            target[key] instanceof Object
        ) {
            Object.assign(source[key], deepMerge(target[key], source[key]));
        }
    }
    return { ...target, ...source };
}

export function isHostAllowed(host: string): boolean {
    const hostFilter = getConfig().hostFilter;
    if (!hostFilter.enabled) {
        return true;
    }
    return hostFilter.allowedHosts.some((allowedHost) => {
        const regex = new RegExp(
            "^" + allowedHost.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$",
        );
        return regex.test(host);
    });
}

export function onLoad(listener: () => void) {
    if (!emitter && config) {
        listener();
        return;
    }
    emitter.on("load", listener);
}

export function removeOnLoad(listener: () => void) {
    if (!emitter) {
        return;
    }
    emitter.off("load", listener);
}
