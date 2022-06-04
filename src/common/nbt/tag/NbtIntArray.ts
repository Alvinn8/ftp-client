import NbtReader from "../NbtReader";
import NbtTag from "./NbtTag";

export default class NbtIntArray extends NbtTag {
    data: Int32Array;
    
    read(reader: NbtReader): void {
        const size = reader.read4();
        this.data = new Int32Array(size);
        for (let i = 0; i < size; i++) {
            this.data[i] = reader.read4();
        }
    }
}