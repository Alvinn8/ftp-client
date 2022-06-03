import NbtReader from "../NbtReader";
import NbtTag from "./NbtTag";

class NbtEnd extends NbtTag {
    read(NbtReader: NbtReader): void {
        throw new Error("end tags do not have a payload");
    }
}

export default new NbtEnd();