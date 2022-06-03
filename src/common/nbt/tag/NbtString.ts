import NbtReader from "../NbtReader";
import NbtTag from "./NbtTag";

export default class NbtString extends NbtTag {
    private data: string;
    
    read(reader: NbtReader): void {
        this.data = reader.readString();
    }
}