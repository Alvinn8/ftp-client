import { describe, expect, it } from "vitest";
import FolderEntry, { FolderEntryType } from "@common/folder/FolderEntry";
import { canMoveInto } from "./actions";

function file(path: string): FolderEntry {
    const name = path.substring(path.lastIndexOf("/") + 1);
    return new FolderEntry(path, name, 0, FolderEntryType.File, "");
}

function dir(path: string): FolderEntry {
    const name = path.substring(path.lastIndexOf("/") + 1);
    return new FolderEntry(path, name, 0, FolderEntryType.Directory, "");
}

describe("canMoveInto", () => {
    it("rejects moving into the directory the entry already lives in", () => {
        expect(canMoveInto([file("/a/x.txt")], "/a")).toBe(false);
        // Trailing slash on the destination must not change the result.
        expect(canMoveInto([file("/a/x.txt")], "/a/")).toBe(false);
    });

    it("rejects moving a folder into itself", () => {
        expect(canMoveInto([dir("/a/sub")], "/a/sub")).toBe(false);
    });

    it("rejects moving a folder into one of its descendants", () => {
        expect(canMoveInto([dir("/a/sub")], "/a/sub/deep")).toBe(false);
    });

    it("allows moving a file into another directory", () => {
        expect(canMoveInto([file("/a/x.txt")], "/b")).toBe(true);
    });

    it("allows moving a folder into an unrelated directory", () => {
        expect(canMoveInto([dir("/a/sub")], "/b")).toBe(true);
    });

    it("rejects when any entry in the selection is invalid", () => {
        const entries = [file("/a/x.txt"), dir("/a/sub")];
        expect(canMoveInto(entries, "/a/sub/deep")).toBe(false);
    });

    it("does not treat a sibling with a shared name prefix as a descendant", () => {
        // "/a/sub2" is not inside "/a/sub" even though the path string starts
        // with "/a/sub".
        expect(canMoveInto([dir("/a/sub")], "/a/sub2")).toBe(true);
    });
});
