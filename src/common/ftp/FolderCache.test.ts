import { describe, expect, it, vi } from "vitest";
import FolderEntry, { FolderEntryType } from "@common/folder/FolderEntry";
import { FolderCache } from "./FolderCache";

function file(path: string, size: number): FolderEntry {
    const name = path.substring(path.lastIndexOf("/") + 1);
    return new FolderEntry(path, name, size, FolderEntryType.File, "");
}

function dir(path: string): FolderEntry {
    const name = path.substring(path.lastIndexOf("/") + 1);
    return new FolderEntry(path, name, 0, FolderEntryType.Directory, "");
}

describe("FolderCache folder sizes", () => {
    it("marks folders as unknown when a file size is unknown", () => {
        const cache = new FolderCache();
        cache.set("/a", [file("/a/x.txt", 10), dir("/a/sub")]);
        cache.set("/a/sub", [file("/a/sub/y.txt", 20), unknownSizeFile()]);

        expect(cache.getCachedFolderSize("/a/sub")).toBe("unknown");
        expect(cache.getCachedFolderSize("/a")).toBe("unknown");

        // Once the size is known, the folder sizes can be calculated.
        cache.updateFileSize("/a/sub/z.txt", 5);
        expect(cache.getCachedFolderSize("/a/sub")).toBe(25);
        expect(cache.getCachedFolderSize("/a")).toBe(35);
    });

    it("marks a folder as unknown even if other sub folders are not calculated", () => {
        const cache = new FolderCache();
        cache.set("/a", [dir("/a/other"), dir("/a/sub")]);
        cache.set("/a/sub", [unknownSizeFile()]);

        expect(cache.getCachedFolderSize("/a/other")).toBeNull();
        expect(cache.getCachedFolderSize("/a")).toBe("unknown");
    });

    it("does not calculate a folder size while a sub folder is missing", () => {
        const cache = new FolderCache();
        cache.set("/a", [file("/a/x.txt", 10), dir("/a/other")]);

        expect(cache.getCachedFolderSize("/a")).toBeNull();
    });
});

function unknownSizeFile(): FolderEntry {
    return new FolderEntry(
        "/a/sub/z.txt",
        "z.txt",
        null,
        FolderEntryType.File,
        null,
    );
}

describe("FolderCache.updateFileSize", () => {
    it("updates the size of the cached file and notifies listeners", () => {
        const cache = new FolderCache();
        cache.set("/a", [file("/a/x.txt", 10), file("/a/y.txt", 20)]);
        const listener = vi.fn();
        cache.subscribe("/a", listener);

        cache.updateFileSize("/a/x.txt", 15);

        const entries = cache.get("/a")!;
        expect(entries.map((e) => e.size)).toEqual([15, 20]);
        expect(entries[0].name).toBe("x.txt");
        expect(listener).toHaveBeenCalled();
    });

    it("updates folder sizes of the folder and its parents", () => {
        const cache = new FolderCache();
        // Set from the top down, since set clears the sizes of sub folders.
        cache.set("/a", [file("/a/y.txt", 20), dir("/a/sub")]);
        cache.set("/a/sub", [file("/a/sub/x.txt", 10), dir("/a/sub/deep")]);
        cache.set("/a/sub/deep", [file("/a/sub/deep/z.txt", 5)]);
        expect(cache.getCachedFolderSize("/a/sub")).toBe(15);
        expect(cache.getCachedFolderSize("/a")).toBe(35);

        cache.updateFileSize("/a/sub/x.txt", 100);

        expect(cache.getCachedFolderSize("/a/sub/deep")).toBe(5);
        expect(cache.getCachedFolderSize("/a/sub")).toBe(105);
        expect(cache.getCachedFolderSize("/a")).toBe(125);
    });

    it("does nothing when the folder is not cached or the file is missing", () => {
        const cache = new FolderCache();
        cache.updateFileSize("/a/x.txt", 15);
        expect(cache.get("/a")).toBeNull();

        cache.set("/a", [file("/a/y.txt", 20)]);
        const listener = vi.fn();
        cache.subscribe("/a", listener);
        cache.updateFileSize("/a/x.txt", 15);
        expect(cache.get("/a")!.map((e) => e.size)).toEqual([20]);
        expect(listener).not.toHaveBeenCalled();
    });
});
