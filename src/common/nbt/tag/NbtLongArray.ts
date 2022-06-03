import NbtReader from "../NbtReader";
import NbtTag from "./NbtTag";

export default class NbtLongArray extends NbtTag {
    private data: BigInt64Array;
    
    read(reader: NbtReader): void {
        const size = reader.read4();
        this.data = new BigInt64Array(size);
        for (let i = 0; i < size; i++) {
            this.data[i] = reader.read8();
        }
    }
}