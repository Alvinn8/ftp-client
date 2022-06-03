/**
 * A reader for reading binary data of different data types from a Uint8Array.
 * 
 * Used for reading nbt.
 */
export default class NbtReader {
    private readonly data: Uint8Array;
    private index: number;

    constructor(data: Uint8Array) {
        this.data = data;
    }

    readByte(): number {
        return this.data[this.index++];
    }

    read4Bytes() {}

    readString(): string {}
}