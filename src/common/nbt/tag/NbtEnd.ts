import NbtReader from "../NbtReader";
import NbtTag from "./NbtTag";

class NbtEnd extends NbtTag {
    read(NbtReader: NbtReader): void {
        throw new Error("Method not implemented.");
    }
}

export default new NbtEnd();