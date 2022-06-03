import { getTagFromId } from "../nbt";
import NbtReader from "../NbtReader";
import NbtTag from "./NbtTag";

export default class NbtCompound extends NbtTag {
    private readonly data: {[key: string]: NbtTag} = {};

    read(reader: NbtReader) {
        let tagId;
        while ((tagId = reader.readU1()) != 0) {
            const tag = getTagFromId(tagId);
            const name = reader.readString();
            tag.read(reader);
            this.data[name] = tag;
        }
    }
}