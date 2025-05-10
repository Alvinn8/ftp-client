import { describe, expect, it } from "vitest";
import { dirname, ensureAbsolute, filename, joinPath, parentdir } from "./utils";
import { formatError } from "./error";

describe("error", () => {

    it("format error", () => {
        expect(formatError(new Error("Hello World"))).toBe("Error: Hello World");
    });

    it("format string", () => {
        expect(formatError("Hello World")).toBe("Error: Hello World");
    });

    it("format other type of error", () => {
        const error = new Error("Example message.");
        error.name  = "ExampleError"
        expect(formatError(error)).toBe("ExampleError: Example message.");
    });
});