/**
 * A hybrid binary/JSON wire format for packets (see GitHub issue #50).
 *
 * The first byte of a message decides the encoding:
 *  - `{` (0x7B) is a regular JSON packet.
 *  - `b` (0x62) is a binary packet that carries a single "blob" property
 *    out-of-band so its bytes travel raw instead of being base64-encoded
 *    (which would inflate them by 4/3).
 *
 * Binary packet layout (all integers are big-endian u4):
 *
 *   1  byte  : 0x62 ('b')
 *   u4       : nameLen      – byte length of the blob property name
 *   nameLen  : UTF-8 string – the property name to store the blob under
 *   u4       : jsonLen      – byte length of the JSON
 *   jsonLen  : UTF-8 string – the rest of the packet (packetId, requestId, ...)
 *   u4       : blobLen      – byte length of the blob
 *   blobLen  : raw bytes    – the blob
 *
 * Decoding yields `{ ...JSON.parse(json), [name]: <Uint8Array> }`.
 */

/** The first byte of a binary packet: `b`. */
export const BINARY_PREFIX = 0x62;
/** The first byte of a JSON packet: `{`. */
export const JSON_PREFIX = 0x7b;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Returns true if the message is a binary packet (starts with `b`), as opposed
 * to a JSON packet (starts with `{`) or a plain-text message (e.g. a handshake).
 *
 * Accepts the forms a WebSocket message can take on either side: a string, an
 * {@link ArrayBuffer}, or a {@link Uint8Array}/Node Buffer.
 */
export function isBinaryMessage(
    data: string | ArrayBuffer | Uint8Array,
): boolean {
    if (typeof data === "string") {
        return data.charCodeAt(0) === BINARY_PREFIX;
    }
    if (data instanceof ArrayBuffer) {
        return data.byteLength > 0 && new Uint8Array(data)[0] === BINARY_PREFIX;
    }
    return data.length > 0 && data[0] === BINARY_PREFIX;
}

/**
 * Returns the name of the first property of {@code data} whose value is binary
 * (a {@link Uint8Array}, which also covers a Node Buffer, or an
 * {@link ArrayBuffer}), or null if there is none. Used to decide whether a
 * packet should be sent as a binary packet and which property holds the blob.
 */
export function findBinaryProperty(data: object): string | null {
    for (const key of Object.keys(data)) {
        const value = (data as Record<string, unknown>)[key];
        if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
            return key;
        }
    }
    return null;
}

function toUint8Array(blob: Uint8Array | ArrayBuffer): Uint8Array {
    return blob instanceof ArrayBuffer ? new Uint8Array(blob) : blob;
}

/**
 * Encodes a binary packet. {@code json} should be the packet without the blob
 * property; {@code name} is the property name the blob should be stored under
 * when decoded.
 */
export function encodeBinaryPacket(
    json: object,
    name: string,
    blob: Uint8Array | ArrayBuffer,
): Uint8Array<ArrayBuffer> {
    const nameBytes = textEncoder.encode(name);
    const jsonBytes = textEncoder.encode(JSON.stringify(json));
    const blobBytes = toUint8Array(blob);

    const totalLength =
        1 + // prefix
        4 +
        nameBytes.length +
        4 +
        jsonBytes.length +
        4 +
        blobBytes.length;

    const result = new Uint8Array(totalLength);
    const view = new DataView(result.buffer);
    let offset = 0;

    result[offset++] = BINARY_PREFIX;

    view.setUint32(offset, nameBytes.length);
    offset += 4;
    result.set(nameBytes, offset);
    offset += nameBytes.length;

    view.setUint32(offset, jsonBytes.length);
    offset += 4;
    result.set(jsonBytes, offset);
    offset += jsonBytes.length;

    view.setUint32(offset, blobBytes.length);
    offset += 4;
    result.set(blobBytes, offset);
    offset += blobBytes.length;

    return result;
}

/**
 * Decodes a binary packet into the object it represents, with the blob stored
 * under its property name as a {@link Uint8Array}.
 */
export function decodeBinaryPacket(
    data: ArrayBuffer | Uint8Array,
): Record<string, any> {
    const bytes = toUint8Array(data);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 0;

    if (bytes[offset++] !== BINARY_PREFIX) {
        throw new Error("Not a binary packet (missing 'b' prefix)");
    }

    const nameLength = view.getUint32(offset);
    offset += 4;
    const name = textDecoder.decode(
        bytes.subarray(offset, offset + nameLength),
    );
    offset += nameLength;

    const jsonLength = view.getUint32(offset);
    offset += 4;
    const jsonString = textDecoder.decode(
        bytes.subarray(offset, offset + jsonLength),
    );
    offset += jsonLength;

    const blobLength = view.getUint32(offset);
    offset += 4;
    // Copy so the blob doesn't retain a reference to the (possibly larger)
    // backing buffer of the incoming message.
    const blob = bytes.slice(offset, offset + blobLength);

    const json = JSON.parse(jsonString);
    json[name] = blob;
    return json;
}
