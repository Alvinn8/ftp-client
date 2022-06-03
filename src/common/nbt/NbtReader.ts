/**
 * A reader for reading binary data of different data types from a Uint8Array.
 * 
 * Used for reading nbt.
 */
export default class NbtReader {
    private readonly data: DataView;
    private readonly bytes: Uint8Array;
    private readonly littleEndian: boolean;
    private index: number;

    constructor(data: Uint8Array, littleEndian = false) {
        this.data = new DataView(data.buffer);
        this.bytes = new Uint8Array(data);
        this.littleEndian = littleEndian;
        this.index = 0;
    }

    /**
     * Get the current index and then increment it by inc.
     *
     * @param inc The value to increment by.
     * @returns The index before adding.
     */
    private incIndex(inc: number): number {
        const ret = this.index;
        this.index += inc;
        return ret;
    }

    /**
     * Read an signed byte.
     */
    read1(): number {
        return this.data.getInt8(this.incIndex(1));
    }

    /**
     * Read an unsigned byte.
     */
    readU1(): number {
        return this.data.getUint8(this.incIndex(1));
    }

    /**
     * Read a two byte signed number.
     */
    read2() {
        return this.data.getInt16(this.incIndex(2), this.littleEndian);
    }

    /**
     * Read a two byte unsigned number.
     */
    readU2() {
        return this.data.getUint16(this.incIndex(2), this.littleEndian);
    }

    /**
     * Read a four byte signed number.
     */
    read4() {
        return this.data.getInt32(this.incIndex(4), this.littleEndian);
    }

    /**
     * Read a eight byte unsigned number.
     */
    readU8(): bigint {
        return this.data.getBigUint64(this.incIndex(8), this.littleEndian);
    }

    /**
     * Read a eight byte signed number.
     */
    read8(): bigint {
        return this.data.getBigInt64(this.incIndex(8), this.littleEndian);
    }

    /**
     * Read a length-prefixed UTF-8 string.
     */
    readString(): string {
        const length = this.readU2();
        const decoder = new TextDecoder();
        const subarray = this.bytes.subarray(this.index, this.index + length);
        this.index += length;
        return decoder.decode(subarray);
    }

    readFloat() {
        return this.data.getFloat32(this.incIndex(4), this.littleEndian);
    }

    readDouble() {
        return this.data.getFloat64(this.incIndex(8), this.littleEndian);
    }
}