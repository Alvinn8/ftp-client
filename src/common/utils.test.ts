import { describe, expect, it } from "vitest";
import { dirname, ensureAbsolute, filename, joinPath, parentdir } from "./utils";

describe("utils", () => {

    it("joinPath /a/b and c", () => {
        expect(joinPath("/a/b", "c")).toBe("/a/b/c");
    });

    it("dirname /a/b/c.txt", () => {
        expect(dirname("/a/b/c.txt")).toBe("/a/b");
    });

    it("dirname /a.txt", () => {
        expect(dirname("/a.txt")).toBe("/");
    });

    it("dirname empty string", () => {
        expect(dirname("")).toBe("/");
    });

    it("dirname file non root", () => {
        expect(dirname("test.txt")).toBe("/");
    });

    it("filename /a/b/c.txt", () => {
        expect(filename("/a/b/c.txt")).toBe("c.txt");
    });

    it("parentdir of directory without leading slash", () => {
        expect(parentdir("/a/b")).toBe("/a");
    });

    it("parentdir of directory with leading slash", () => {
        expect(parentdir("/a/b/")).toBe("/a");
    });

    it("parentdir of root", () => {
        expect(parentdir("/")).toBe("/");
    });

    it("parentdir of empty string", () => {
        expect(parentdir("/")).toBe("/");
    });
});