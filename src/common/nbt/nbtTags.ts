import NbtReader from "./NbtReader";
import NbtWriter from "./NbtWriter";
import { getIdFromTag, getTagFromId } from "./nbt";

export abstract class NbtTag {
    /**
     * Read the content of this tag into this instance.
     * 
     * Will not read the name.
     * 
     * @param reader The reader to read from.
     */
    abstract read(reader: NbtReader): void;

    /**
     * Write the content of this tag.
     * 
     * Will only write the content and not the tag id and name.
     * 
     * @param writer The writer to write to.
     */
    abstract write(writer: NbtWriter): void;
}

export class NbtCompound extends NbtTag {
    private readonly data: {[key: string]: NbtTag} = {};
    private readonly orderedKeys: string[] = [];

    read(reader: NbtReader) {
        let tagId;
        while ((tagId = reader.readU1()) != 0) {
            const tag = getTagFromId(tagId);
            const name = reader.readString();
            tag.read(reader);
            this.data[name] = tag;
            this.orderedKeys.push(name);
        }
    }

    write(writer: NbtWriter) {
        for (const key of this.orderedKeys) {
            const tag = this.get(key);
            writer.writeU1(getIdFromTag(tag));
            writer.writeString(key);
            tag.write(writer);
        }
        writer.writeU1(0); // end tag
    }

    get(name: string): NbtTag | null {
        return this.data[name] || null;
    }

    /**
     * Return an ordered array of keys in this compound.
     * 
     * The order is the order they were read in.
     * 
     * @returns The keys.
     */
    getKeys(): string[] {
        return this.orderedKeys.slice(0);
    }

    /**
     * Rename a key while keeping it in the same position.
     */
    renameKey(oldKey: string, newKey: string): void {
        const index = this.orderedKeys.indexOf(oldKey);
        if (index == -1) {
            throw new Error("Key not found");
        }
        this.orderedKeys[index] = newKey;
        this.data[newKey] = this.data[oldKey];
        delete this.data[oldKey];
    }

    /**
     * Remove a key from the compound.
     */
    remove(key: string): void {
        const index = this.orderedKeys.indexOf(key);
        if (index == -1) {
            throw new Error("Key not found");
        }
        this.orderedKeys.splice(index, 1);
        delete this.data[key];
    }

    /**
     * Replace a key with a new tag while keeping it in the same position.
     */
    replace(key: string, newTag: NbtTag): void {
        const index = this.orderedKeys.indexOf(key);
        if (index == -1) {
            throw new Error("Key not found");
        }
        this.data[key] = newTag;
    }

    /**
     * Add a new key to the compound.
     */
    add(key: string, newTag: NbtTag): void {
        if (this.data[key]) {
            throw new Error("Key already exists");
        }
        this.data[key] = newTag;
        this.orderedKeys.push(key);
    }
}

export class NbtList extends NbtTag {
    listTypeId: number = 0;
    data: NbtTag[] = [];
    
    read(reader: NbtReader): void {
        this.listTypeId = reader.readU1();
        
        const size = reader.read4();
        this.data = new Array(size);

        if (this.listTypeId == 0 && size !== 0) {
            // Null tags are only allowed as a type if the list is empty.
            throw new Error("Cannot have a non-empty list of end tags.");
        }
        
        for (let i = 0; i < size; i++) {
            const tag = getTagFromId(this.listTypeId);
            tag.read(reader);
            this.data[i] = tag;
        }
    }

    write(writer: NbtWriter): void {
        writer.writeU1(this.listTypeId);
        writer.write4(this.data.length);
        
        for (let i = 0; i < this.data.length; i++) {
            const tag = this.data[i];
            tag.write(writer);
        }
    }

    changeListType(newTypeId: number): void {
        this.listTypeId = newTypeId;
        this.data = [];
    }

    remove(index: number): void {
        this.data.splice(index, 1);
    }

    move(oldIndex: number, newIndex: number): void {
        const tag = this.data[oldIndex];
        this.remove(oldIndex);
        this.data.splice(newIndex, 0, tag);
    }

    replace(index: number, newTag: NbtTag): void {
        this.data[index] = newTag;
    }

    add(tag: NbtTag): void {
        if (this.listTypeId !== getIdFromTag(tag)) {
            throw new Error("Cannot add a tag of a different type to a list.");
        }
        this.data.push(tag);
    }
}

export const NbtEnd: NbtTag = {
    read(reader: NbtReader): void {
        throw new Error("end tags do not have a payload");
    },
    write(writer: NbtWriter) {
        throw new Error("end tags do not have a payload");
    }
};

export class NbtString extends NbtTag {
    value: string = "";
    
    read(reader: NbtReader): void {
        this.value = reader.readString();
    }

    write(writer: NbtWriter): void {
        writer.writeString(this.value);
    }
}

/**
 * A nbt tag with an array of a simple datatype.
 */
export abstract class ArrayNbtTag extends NbtTag {
    /**
     * Get the length of the array.
     */
    abstract length(): number;

    /**
     * Get the array formatted in SNBT.
     */
    abstract toSNBT(): string;
}

export class NbtByteArray extends ArrayNbtTag {
    data: Int8Array = new Int8Array();

    read(reader: NbtReader): void {
        const size = reader.read4();
        this.data = new Int8Array(size);
        for (let i = 0; i < size; i++) {
            this.data[i] = reader.read1();
        }
    }

    write(writer: NbtWriter): void {
        writer.write4(this.data.length);
        for (let i = 0; i < this.data.length; i++) {
            writer.write1(this.data[i]);
        }
    }

    length(): number {
        return this.data.length;
    }

    toSNBT(): string {
        let str = "[B;";
        for (let i = 0; i < this.data.length; i++) {
            str += this.data[i] + "b, ";
        }
        if (this.data.length > 0) {
            str = str.slice(0, -2);
        }
        str += "]";
        return str;
    }
}

export class NbtIntArray extends ArrayNbtTag {
    data: Int32Array = new Int32Array();
    
    read(reader: NbtReader): void {
        const size = reader.read4();
        this.data = new Int32Array(size);
        for (let i = 0; i < size; i++) {
            this.data[i] = reader.read4();
        }
    }

    write(writer: NbtWriter): void {
        writer.write4(this.data.length);
        for (let i = 0; i < this.data.length; i++) {
            writer.write4(this.data[i]);
        }
    }

    length(): number {
        return this.data.length;
    }

    toSNBT(): string {
        let str = "[I;";
        for (let i = 0; i < this.data.length; i++) {
            str += this.data[i] + ", ";
        }
        if (this.data.length > 0) {
            str = str.slice(0, -2);
        }
        str += "]";
        return str;
    }
}

export class NbtLongArray extends ArrayNbtTag {
    data: BigInt64Array = new BigInt64Array();
    
    read(reader: NbtReader): void {
        const size = reader.read4();
        this.data = new BigInt64Array(size);
        for (let i = 0; i < size; i++) {
            this.data[i] = reader.read8();
        }
    }

    write(writer: NbtWriter): void {
        writer.write4(this.data.length);
        for (let i = 0; i < this.data.length; i++) {
            writer.write8(this.data[i]);
        }
    }

    length(): number {
        return this.data.length;
    }

    toSNBT(): string {
        let str = "[L;";
        for (let i = 0; i < this.data.length; i++) {
            str += this.data[i] + "l, ";
        }
        if (this.data.length > 0) {
            str = str.slice(0, -2);
        }
        str += "]";
        return str;
    }
}

/**
 * A number nbt tag.
 */
export abstract class NumberNbtTag extends NbtTag {
    /**
     * Format the number as a string.
     */
    abstract toString(): string;
    /**
     * Get the character used to identify the type of tag. Null for none.
     */
    abstract getTypeChar(): string;
}

export class NbtByte extends NumberNbtTag {
    value: number = 0;

    read(reader: NbtReader): void {
        this.value = reader.read1();
    }

    write(writer: NbtWriter): void {
        writer.write1(this.value);
    }

    toString(): string {
        return this.value.toString();
    }

    getTypeChar(): string {
        return "b";
    }
}

export class NbtShort extends NumberNbtTag {
    value: number = 0;
    
    read(reader: NbtReader): void {
        this.value = reader.read2();
    }

    write(writer: NbtWriter): void {
        writer.write2(this.value);
    }

    toString(): string {
        return this.value.toString();
    }

    getTypeChar(): string {
        return "s";
    }
}

export class NbtInt extends NumberNbtTag {
    value: number = 0;
    
    read(reader: NbtReader): void {
        this.value = reader.read4();
    }

    write(writer: NbtWriter): void {
        writer.write4(this.value);
    }

    toString(): string {
        return this.value.toString();
    }

    getTypeChar(): string {
        return null;
    }
}

export class NbtLong extends NumberNbtTag {
    value: bigint = BigInt(0);
    
    read(reader: NbtReader): void {
        this.value = reader.read8();
    }

    write(writer: NbtWriter): void {
        writer.write8(this.value);
    }

    toString(): string {
        return this.value.toString();
    }

    getTypeChar(): string {
        return "L";
    }
}

export class NbtFloat extends NumberNbtTag {
    value: number = 0;
    
    read(reader: NbtReader): void {
        this.value = reader.readFloat();
    }

    write(writer: NbtWriter): void {
        writer.writeFloat(this.value);
    }

    toString(): string {
        return this.value.toString();
    }

    getTypeChar(): string {
        return "f";
    }
}

export class NbtDouble extends NumberNbtTag {
    value: number = 0;
    
    read(reader: NbtReader): void {
        this.value = reader.readDouble();
    }

    write(writer: NbtWriter): void {
        writer.writeDouble(this.value);
    }

    toString(): string {
        return this.value.toString();
    }

    getTypeChar(): string {
        return "d";
    }
}