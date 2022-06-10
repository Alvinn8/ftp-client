/**
 * A writer for reading binary data of different data types to a Uint8Array.
 * 
 * Used for writing nbt.
 */
 export default class NbtWriter {
    private data: DataView;
    bytes: Uint8Array;
    littleEndian: boolean;
    index: number;

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
     * Ensure the writer buffer fits the specified additional bytes.
     * 
     * @param size The additional bytes.
     */
    private ensureSize(size: number)  {
        const requiredLength = this.index + size;
        if (this.bytes.buffer.byteLength < requiredLength) {
            const oldLength = this.bytes.byteLength;
            let newLength = oldLength;
            while (newLength < requiredLength) {
                if (newLength < 100) {
                    newLength = 100;
                }
				newLength *= 1.25;
			}
            console.log("Expanding buffer " + oldLength + " --> " + newLength);
            const newBytes = new Uint8Array(newLength);
            // Write old data to new
            newBytes.set(this.bytes);
            this.bytes = newBytes;
            this.data = new DataView(newBytes.buffer);
        }
    }

    /**
     * Write an signed byte.
     */
    write1(byte: number) {
        this.ensureSize(1);
        this.data.setInt8(this.incIndex(1), byte);
    }

    /**
     * Write an unsigned byte.
     */
    writeU1(byte: number) {
        this.ensureSize(1);
        this.data.setUint8(this.incIndex(1), byte);
    }

    /**
     * Write a two byte signed number.
     */
    write2(value: number) {
        this.ensureSize(2);
        this.data.setInt16(this.incIndex(2), value, this.littleEndian);
    }

    /**
     * Write a two byte unsigned number.
     */
    writeU2(value: number) {
        this.ensureSize(2);
        this.data.setUint16(this.incIndex(2), value, this.littleEndian);
    }

    /**
     * Write a four byte signed number.
     */
    write4(value: number) {
        this.ensureSize(4);
        this.data.setInt32(this.incIndex(4), value, this.littleEndian);
    }

    /**
     * Write a eight byte signed number.
     */
    write8(value: bigint) {
        this.ensureSize(8);
        this.data.setBigInt64(this.incIndex(8), value, this.littleEndian);
    }

    /**
     * Write a length-prefixed UTF-8 string.
     */
    writeString(value: string) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(value);
        this.writeU2(bytes.byteLength);
        this.ensureSize(bytes.byteLength);
        this.bytes.set(bytes, this.index);
        this.index += bytes.byteLength;
    }

    writeFloat(value: number) {
        this.ensureSize(4);
        this.data.setFloat32(this.incIndex(4), value, this.littleEndian);
    }

    writeDouble(value: number) {
        this.ensureSize(8);
        this.data.setFloat64(this.incIndex(8), value, this.littleEndian);
    }
}