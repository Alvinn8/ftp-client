import NbtReader from "../NbtReader";
import NbtTag from "./NbtTag";

export default class NbtLong extends NbtTag {
    value: bigint;
    
    read(reader: NbtReader): void {
        this.value = reader.readU8();
    }
}