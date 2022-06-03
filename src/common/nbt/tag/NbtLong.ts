import NbtReader from "../NbtReader";
import NbtTag from "./NbtTag";

export default class NbtLong extends NbtTag {
    private data: bigint;
    
    read(reader: NbtReader): void {
        this.data = reader.readU8();
    }
}