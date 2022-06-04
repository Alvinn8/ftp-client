import NbtReader from "../NbtReader";
import NbtTag from "./NbtTag";

export default class NbtFloat extends NbtTag {
    value: number;
    
    read(reader: NbtReader): void {
        this.value = reader.readFloat();
    }
}