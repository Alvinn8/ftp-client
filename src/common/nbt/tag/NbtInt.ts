import NbtReader from "../NbtReader";
import NbtTag from "./NbtTag";

export default class NbtInt extends NbtTag {
    value: number;
    
    read(reader: NbtReader): void {
        this.value = reader.read4();
    }
}