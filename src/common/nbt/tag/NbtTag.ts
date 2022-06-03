import NbtReader from "../NbtReader";

export default abstract class NbtTag {
    /**
     * Read the content of this tag into this instance.
     * 
     * Will not read the name.
     * 
     * @param reader The reader to read from.
     */
    abstract read(reader: NbtReader): void;
}