import NbtReader from "../NbtReader";
import NbtTag from "./NbtTag";

export default class NbtString extends NbtTag {
    value: string;
    
    read(reader: NbtReader): void {
        this.value = reader.readString();
    }
}