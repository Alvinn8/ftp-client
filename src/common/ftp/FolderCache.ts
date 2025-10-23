import { useEffect, useState } from "react";
import FolderEntry from "../folder/FolderEntry";
import FTPSession from "./FTPSession";
import { directoryAction } from "../task/taskActions";
import Dialog from "../Dialog";
import { usePath } from "../ui2/store/pathStore";
import { parentdir } from "../utils";
import { formatError } from "../error";

export class FolderCache {
    private cache: Map<string, FolderEntry[]> = new Map();
    private listeners: Map<string, (() => void)[]> = new Map();
    private pendingFetches = new Set<string>();

    get(path: string): FolderEntry[] | null {
        return this.cache.get(path) || null;
    }

    set(path: string, entries: FolderEntry[]) {
        this.cache.set(path, entries);
        if (this.listeners.has(path)) {
            for (const listener of this.listeners.get(path)!) {
                listener();
                console.log("notifying");
            }
        }
    }

    subscribe(path: string, listener: () => void) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, []);
        }
        this.listeners.get(path)!.push(listener);
    }

    unsubscribe(path: string, listener: () => void) {
        if (this.listeners.has(path)) {
            this.listeners.set(
                path,
                this.listeners.get(path)!.filter((l) => l !== listener),
            );
        }
    }

    fetch(session: FTPSession, path: string) {
        if (this.pendingFetches.has(path)) {
            return;
        }
        this.pendingFetches.add(path);
        console.log("fetching");
        directoryAction(session, path, async (connection) => {
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
                }
            } finally {
                this.pendingFetches.delete(path);
            }
            console.log("setting");
        });
    }

    fetchIfNotCached(session: FTPSession, path: string) {
        if (!this.cache.has(path)) {
            this.fetch(session, path);
        }
    }
}

export function useFolderContent(session: FTPSession, path: string) {
    const [entries, setEntries] = useState(() => session.folderCache.get(path));
    useEffect(() => {
        const listener = () => {
            setEntries(session.folderCache.get(path));
        };
        session.folderCache.fetchIfNotCached(session, path);
        session.folderCache.subscribe(path, listener);
        listener();
        return () => {
            session.folderCache.unsubscribe(path, listener);
        };
    }, [session, path]);

    return entries;
}
