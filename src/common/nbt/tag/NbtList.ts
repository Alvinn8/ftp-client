import { getTagFromId } from "../nbt";
import NbtReader from "../NbtReader";
import NbtTag from "./NbtTag";

export default class NbtList extends NbtTag {
    private data: NbtTag[];
    
    read(reader: NbtReader): void {
        const listTypeId = reader.readU1();
        
        const size = reader.read4();
        this.data = new Array(size);

        if (listTypeId == 0) {
            // Null tags are only allowed as a type if the list is empty.
            if (size > 0) {
                throw new Error("Cannot have a non-empty list of end tags.");
            }
            return;
        }
        
        for (let i = 0; i < size; i++) {
            const tag = getTagFromId(listTypeId);;
            tag.read(reader);
            this.data[i] = tag;
        }
    }
}