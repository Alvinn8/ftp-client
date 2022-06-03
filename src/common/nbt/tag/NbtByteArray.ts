import NbtReader from "../NbtReader";
import NbtTag from "./NbtTag";

export default class NbtByteArray extends NbtTag {
    private data: Int8Array;

    read(reader: NbtReader): void {
        const size = reader.read4();
        this.data = new Int8Array(size);
        for (let i = 0; i < size; i++) {
            this.data[i] = reader.read1();
        }
    }
}