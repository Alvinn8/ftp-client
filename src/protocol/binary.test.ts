import { describe, expect, it } from "vitest";
import {
    decodeBinaryPacket,
    encodeBinaryPacket,
    findBinaryProperty,
    isBinaryMessage,
} from "./binary";

describe("binary protocol", () => {
    it("round-trips a packet with an ASCII property and JSON", () => {
        const blob = new TextEncoder().encode("Hello, world!");
        const encoded = encodeBinaryPacket(
            { packetId: 9, requestId: "123456", path: "/example/foo.bin" },
            "data",
            blob,
        );

        const decoded = decodeBinaryPacket(encoded);
        expect(decoded.packetId).toBe(9);
        expect(decoded.requestId).toBe("123456");
        expect(decoded.path).toBe("/example/foo.bin");
        expect(new TextDecoder().decode(decoded.data)).toBe("Hello, world!");
    });

    it("handles an empty blob", () => {
        const encoded = encodeBinaryPacket(
            { ok: true },
            "data",
            new Uint8Array(0),
        );
        const decoded = decodeBinaryPacket(encoded);
        expect(decoded.ok).toBe(true);
        expect(decoded.data.length).toBe(0);
    });

    it("round-trips a large (1 MB) blob", () => {
        const blob = new Uint8Array(1024 * 1024);
        for (let i = 0; i < blob.length; i++) {
            blob[i] = i % 256;
        }
        const decoded = decodeBinaryPacket(
            encodeBinaryPacket({ n: blob.length }, "data", blob),
        );
        expect(decoded.n).toBe(blob.length);
        expect(decoded.data.length).toBe(blob.length);
        expect(decoded.data[0]).toBe(0);
        expect(decoded.data[255]).toBe(255);
        expect(decoded.data[blob.length - 1]).toBe((blob.length - 1) % 256);
    });

    it("decodes from a raw ArrayBuffer", () => {
        const blob = new Uint8Array([42]);
        const encoded = encodeBinaryPacket({ a: 1 }, "data", blob);
        const arrayBuffer = encoded.buffer.slice(
            encoded.byteOffset,
            encoded.byteOffset + encoded.byteLength,
        );
        const decoded = decodeBinaryPacket(arrayBuffer);
        expect(decoded.a).toBe(1);
        expect(decoded.data[0]).toBe(42);
    });

    describe("isBinaryMessage", () => {
        it("recognises binary packets across forms", () => {
            const encoded = encodeBinaryPacket({}, "data", new Uint8Array([0]));
            expect(isBinaryMessage(encoded)).toBe(true);
            expect(isBinaryMessage(encoded.buffer)).toBe(true);
            expect(isBinaryMessage("b...")).toBe(true);
        });

        it("treats a JSON string as not binary", () => {
            expect(isBinaryMessage('{"packetId":1}')).toBe(false);
        });

        it("treats a handshake string as not binary", () => {
            expect(isBinaryMessage("handshake json 2")).toBe(false);
        });
    });

    describe("findBinaryProperty", () => {
        it("finds a Uint8Array property", () => {
            expect(
                findBinaryProperty({ path: "/a", data: new Uint8Array(2) }),
            ).toBe("data");
        });

        it("finds an ArrayBuffer property", () => {
            expect(findBinaryProperty({ data: new ArrayBuffer(2) })).toBe(
                "data",
            );
        });

        it("returns null when there is no binary property", () => {
            expect(findBinaryProperty({ path: "/a", size: 3 })).toBeNull();
        });
    });
});
