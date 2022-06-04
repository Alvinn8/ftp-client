import { ensurePakoScriptIsLoaded } from "../utils";
import NbtReader from "./NbtReader";
import NbtResult, { BedrockLevelDat, Compression, EditionData } from "./NbtResult";
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

export async function readNbt(blob: Blob): Promise<NbtResult> {
    let data = new Uint8Array(await blob.arrayBuffer());
    let origData = data;
    
    let compression: Compression = "none";
    let editionData: EditionData;
    let tag: NbtTag;

    if (data[0] == 0x1F && data[1] == 0x8B) {
        // gzip magic number 1F 8B
        compression = "gzip";
    }
    else if (data[0] == 0x78) {
        // zlib magic number 0x78
        compression = "zlib";
    }

    if (compression != "none") {
        // pako will auto detect the algorithm
        await ensurePakoScriptIsLoaded();
        // @ts-ignore
        data = pako.inflate(origData);
    }
    
    const reader = new NbtReader(data);

    // Java edition?
    editionData = {
        edition: "java",
        littleEndian: false
    };
    reader.littleEndian = false;
    reader.index = 0;
    tag = await attemptReadNbtTag(reader);

    // Bedrock edition?
    if (tag == null) {
        editionData = {
            edition: "bedrock",
            littleEndian: true
        };
        reader.littleEndian = true;
        reader.index = 0;
        tag = await attemptReadNbtTag(reader);
    }

    // Bedrock edition level.dat?
    if (tag == null) {
        reader.littleEndian = true;
        reader.index = 0;
        const headerVersion = reader.read4();
        const fileSize = reader.read4();
        if (fileSize == data.byteLength - 8) {
            editionData = {
                edition: "bedrock",
                littleEndian: true,
                isLevelDat: true,
                headerVersion
            } as BedrockLevelDat;
            tag = await attemptReadNbtTag(reader);
        }
    }

    if (tag == null) {
        throw new Error("That is not an nbt file.");
    }

    return {
        tag,
        compression,
        editionData
    };
}

async function attemptReadNbtTag(reader: NbtReader) {
    try {
        const tagId = reader.readU1();
        const tag = getTagFromId(tagId);
        reader.readString();
        tag.read(reader);
        return tag;
    } catch {
        return null;
    }
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