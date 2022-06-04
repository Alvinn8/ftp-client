import NbtReader from "../NbtReader";
import NbtTag from "./NbtTag";

export default class NbtByte extends NbtTag {
    value: number;

    read(reader: NbtReader): void {
        this.value = reader.read1();
    }
}