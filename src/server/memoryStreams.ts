import { Readable, ReadableOptions, Writable } from "stream";

export class WritableMemoryStream extends Writable {
    private buffer: Buffer = Buffer.from("");

    _write(chunk: any, encoding: BufferEncoding, callback: Function) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
        this.buffer = Buffer.concat([this.buffer, buffer]);
        callback();
    }

    getBuffer() {
        return this.buffer;
    }
}

export class ReadableMemoryStream extends Readable {
    private buffer: Buffer;

    constructor(buffer: Buffer, opts?: ReadableOptions) {
        super(opts);
        this.buffer = buffer;
    }

    _read() {
        this.push(this.buffer);
        this.buffer = null;
    }
}