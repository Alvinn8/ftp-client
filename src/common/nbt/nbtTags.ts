import NbtReader from "./NbtReader";
import { getTagFromId } from "./nbt";

export abstract class NbtTag {
    /**
     * Read the content of this tag into this instance.
     * 
     * Will not read the name.
     * 
     * @param reader The reader to read from.
     */
    abstract read(reader: NbtReader): void;
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

    get(name: string): NbtTag | null {
        return this.data[name] || null;
    }
}

export class NbtList extends NbtTag {
    data: NbtTag[];
    
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

export const NbtEnd: NbtTag = {
    read(reader: NbtReader): void {
        throw new Error("end tags do not have a payload");
    }
};

/**
 * A nbt tag with an array of a simple datatype.
 */
export abstract class ArrayNbtTag {}

export class NbtByteArray extends ArrayNbtTag {
    data: Int8Array;

    read(reader: NbtReader): void {
        const size = reader.read4();
        this.data = new Int8Array(size);
        for (let i = 0; i < size; i++) {
            this.data[i] = reader.read1();
        }
    }
}

export class NbtIntArray extends ArrayNbtTag {
    data: Int32Array;
    
    read(reader: NbtReader): void {
        const size = reader.read4();
        this.data = new Int32Array(size);
        for (let i = 0; i < size; i++) {
            this.data[i] = reader.read4();
        }
    }
}

export class NbtLongArray extends ArrayNbtTag {
    data: BigInt64Array;
    
    read(reader: NbtReader): void {
        const size = reader.read4();
        this.data = new BigInt64Array(size);
        for (let i = 0; i < size; i++) {
            this.data[i] = reader.read8();
        }
    }
}

/**
 * A simple nbt tag. A number or string.
 */
export abstract class SimpleNbtTag {}

export class NbtByte extends SimpleNbtTag {
    value: number;

    read(reader: NbtReader): void {
        this.value = reader.read1();
    }
}

export class NbtShort extends SimpleNbtTag {
    value: number;
    
    read(reader: NbtReader): void {
        this.value = reader.read2();
    }
}

export class NbtInt extends SimpleNbtTag {
    value: number;
    
    read(reader: NbtReader): void {
        this.value = reader.read4();
    }
}

export class NbtLong extends SimpleNbtTag {
    value: bigint;
    
    read(reader: NbtReader): void {
        this.value = reader.read8();
    }
}

export class NbtFloat extends SimpleNbtTag {
    value: number;
    
    read(reader: NbtReader): void {
        this.value = reader.readFloat();
    }
}

export class NbtDouble extends SimpleNbtTag {
    value: number;
    
    read(reader: NbtReader): void {
        this.value = reader.readDouble();
    }
}

export class NbtString extends SimpleNbtTag {
    value: string;
    
    read(reader: NbtReader): void {
        this.value = reader.readString();
    }
}