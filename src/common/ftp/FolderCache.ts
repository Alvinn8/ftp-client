import { useEffect, useState } from "react";
import FolderEntry from "../folder/FolderEntry";
import FTPSession from "./FTPSession";
import { performWithRetry } from "../task/taskActions";
import Dialog from "../Dialog";
import { usePath } from "../ui2/store/pathStore";
import { joinPath, parentdir } from "../utils";
import { formatError, unexpectedErrorHandler } from "../error";

export class FolderCache {
    private cache: Map<string, FolderEntry[]> = new Map();
    private folderSizeCache: Map<string, number> = new Map();
    private listeners: Map<string, (() => void)[]> = new Map();
    private pendingFetches = new Set<string>();

    private normalizePath(path: string): string {
        if (!path.endsWith("/")) {
            path += "/";
        }
        return path;
    }

    get(path: string): FolderEntry[] | null {
        window["folderCache"] = this
        return this.cache.get(this.normalizePath(path)) || null;
    }

    set(path: string, entries: FolderEntry[]) {
        path = this.normalizePath(path);
        this.cache.set(path, entries);
        // Remove all cached folder sizes for all folders
        // that start with the path
        for (const cachedPath of this.folderSizeCache.keys()) {
            if (cachedPath.startsWith(path)) {
                this.folderSizeCache.delete(cachedPath);
            }
        }
        this.bubbleUpdateFolderSizes(path);
        if (this.listeners.has(path)) {
            for (const listener of this.listeners.get(path)!) {
                listener();
            }
        }
    }

    remove(path: string) {
        path = this.normalizePath(path);
        this.cache.delete(path);
        if (this.listeners.has(path)) {
            for (const listener of this.listeners.get(path)!) {
                listener();
            }
        }
    }

    clear() {
        this.cache.clear();
        for (const [, listeners] of this.listeners) {
            for (const listener of listeners) {
                listener();
            }
        }
        this.folderSizeCache.clear();
    }

    clearAndFetch(session: FTPSession, path: string) {
        this.clear();
        this.fetch(session, this.normalizePath(path));
    }

    subscribe(path: string, listener: () => void) {
        path = this.normalizePath(path);
        if (!this.listeners.has(path)) {
            this.listeners.set(path, []);
        }
        this.listeners.get(path)!.push(listener);
    }

    unsubscribe(path: string, listener: () => void) {
        path = this.normalizePath(path);
        if (this.listeners.has(path)) {
            this.listeners.set(
                path,
                this.listeners.get(path)!.filter((l) => l !== listener),
            );
        }
    }

    fetch(session: FTPSession, path: string) {
        path = this.normalizePath(path);
        if (this.pendingFetches.has(path)) {
            return;
        }
        this.pendingFetches.add(path);
        performWithRetry(session, path, async (connection) => {
            try {
                const list = await connection.list(path);
                this.set(path, list);
            } catch (err) {
                if (String(err).includes("ENOENT")) {
                    Dialog.message(
                        "This folder has been deleted",
                        "It appears the folder you were trying to go to has been deleted. The full error is: " +
                            formatError(err),
                    );
                    const { path, setPath } = usePath.getState();
                    if (path !== "/") {
                        setPath(parentdir(path));
                    }
                } else {
                    throw err;
                }
            } finally {
                this.pendingFetches.delete(path);
            }
        }).catch(unexpectedErrorHandler("Failed to fetch folder entries"));
    }

    fetchIfNotCached(session: FTPSession, path: string) {
        path = this.normalizePath(path);
        if (!this.cache.has(path)) {
            this.fetch(session, path);
        }
    }

    getCachedFolderSize(path: string): number | null {
        path = this.normalizePath(path);
        return this.folderSizeCache.get(path) ?? null;
    }

    setCachedFolderSize(path: string, size: number) {
        path = this.normalizePath(path);
        this.folderSizeCache.set(path, size);
        if (this.listeners.has(path)) {
            for (const listener of this.listeners.get(path)!) {
                listener();
            }
        }
    }

    private bubbleUpdateFolderSizes(path: string) {
        path = this.normalizePath(path);
        if (path === "/") return;
        const entries = this.cache.get(path);
        if (!entries) return;
        let size = 0;
        for (const entry of entries) {
            if (entry.isFile()) {
                size += entry.size;
            } else if (entry.isDirectory()) {
                const dirSize = this.folderSizeCache.get(
                    this.normalizePath(joinPath(path, entry.name)),
                );
                if (dirSize === undefined) {
                    // One was missing, we cannot continue.
                    return;
                }
                size += dirSize;
            } else {
                // Symlink? We cannot continue.
                return;
            }
        }
        this.setCachedFolderSize(path, size);
        this.bubbleUpdateFolderSizes(parentdir(path));
    }
}

export function useFolderContent(session: FTPSession, path: string, active: boolean = true): FolderEntry[] | null {
    const [entries, setEntries] = useState(() => session.folderCache.get(path));
    useEffect(() => {
        if (!active) {
            return;
        }
        const listener = () => {
            session.folderCache.fetchIfNotCached(session, path);
            setEntries(session.folderCache.get(path));
        };
        session.folderCache.fetchIfNotCached(session, path);
        session.folderCache.subscribe(path, listener);
        listener();
        return () => {
            session.folderCache.unsubscribe(path, listener);
        };
    }, [session, path, active]);

    if (!active) {
        return null;
    }

    return entries;
}

export function useFolderCacheSize(session: FTPSession, path: string, active: boolean): number | null {
    const [size, setSize] = useState(() => session.folderCache.getCachedFolderSize(path));
    useEffect(() => {
        if (!active) {
            return;
        }
        const listener = () => {
            setSize(session.folderCache.getCachedFolderSize(path));
        };
        session.folderCache.subscribe(path, listener);
        listener();
        return () => {
            session.folderCache.unsubscribe(path, listener);
        };
    }, [session, path, active]);

    if (!active) {
        return null;
    }

    return size;
}
