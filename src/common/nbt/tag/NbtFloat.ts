import NbtReader from "../NbtReader";
import NbtTag from "./NbtTag";

export default class NbtFloat extends NbtTag {
    private data: number;
    
    read(reader: NbtReader): void {
        this.data = reader.readFloat();
    }
}