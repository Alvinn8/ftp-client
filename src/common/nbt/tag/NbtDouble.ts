import NbtReader from "../NbtReader";
import NbtTag from "./NbtTag";

export default class NbtDouble extends NbtTag {
    value: number;
    
    read(reader: NbtReader): void {
        this.value = reader.readDouble();
    }
}