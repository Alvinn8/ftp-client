import { ensurePakoScriptIsLoaded } from "../utils";
import NbtReader from "./NbtReader";
import NbtByte from "./tag/NbtByte";
import NbtByteArray from "./tag/NbtByteArray";
import NbtCompound from "./tag/NbtCompound";
import NbtDouble from "./tag/NbtDouble";
import NbtEnd from "./tag/NbtEnd";
import NbtFloat from "./tag/NbtFloat";
import NbtInt from "./tag/NbtInt";
import NbtIntArray from "./tag/NbtIntArray";
import NbtList from "./tag/NbtList";
import NbtLong from "./tag/NbtLong";
import NbtLongArray from "./tag/NbtLongArray";
import NbtShort from "./tag/NbtShort";
import NbtString from "./tag/NbtString";
import NbtTag from "./tag/NbtTag";

// var blob = $0.files[0];
// var nbt = await import("./js/common/nbt/nbt.js");
// var NbtReader = (await import("./js/common/nbt/NbtReader.js")).default;

/*
var blob = $0.files[0];
var nbt = await import("./js/common/nbt/nbt.js");
nbt.readJavaEditionUncompressedNbt(blob);
*/

export async function readNbt(blob: Blob) {
    let data = new Uint8Array(await blob.arrayBuffer());
    let origData = data;
    if ((data[0] == 0x1F && data[1] == 0x8B) || data[0] == 0x78) {
        // if we detect the zlib/gzip magic number 1F 0B or 78 then inflate the
        // data before reading
        await ensurePakoScriptIsLoaded();
        // @ts-ignore
        data = pako.inflate(origData);
    }
    return await readNbt0(data, false); // true for little endian = bedrock (doesn't work)
}

export async function readNbt0(data: Uint8Array, littleEndian: boolean): Promise<NbtTag> {
    const reader = new NbtReader(data, littleEndian);
    const tagId = reader.readU1();
    const tag = getTagFromId(tagId);
    tag.read(reader);
    return tag;
}

export function getTagFromId(id: number): NbtTag {
    switch (id) {
        case 0: return NbtEnd;
        case 1: return new NbtByte();
        case 2: return new NbtShort();
        case 3: return new NbtInt();
        case 4: return new NbtLong();
        case 5: return new NbtFloat();
        case 6: return new NbtDouble();
        case 7: return new NbtByteArray();
        case 8: return new NbtString();
        case 9: return new NbtList();
        case 10: return new NbtCompound();
        case 11: return new NbtIntArray();
        case 11: return new NbtLongArray();
    
        default:
            throw new Error("Unknown tag type: " + id);
    }
}