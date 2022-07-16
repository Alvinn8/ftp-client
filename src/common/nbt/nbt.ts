import { ensurePakoScriptIsLoaded } from "../utils";
import NbtReader from "./NbtReader";
import NbtData, { BedrockEdition, BedrockLevelDat, Compression, EditionData } from "./NbtData";
import { NbtByte, NbtByteArray, NbtCompound, NbtDouble, NbtEnd, NbtFloat, NbtInt, NbtIntArray, NbtList, NbtLong, NbtLongArray, NbtShort, NbtString, NbtTag } from "./nbtTags";
import NbtWriter from "./NbtWriter";

export async function readNbt(blob: Blob): Promise<NbtData> {
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
        case 12: return new NbtLongArray();
    
        default:
            throw new Error("Unknown tag type: " + id);
    }
}

export function getIdFromTag(tag: NbtTag) {
    if (tag == NbtEnd)                  return 0;
    if (tag instanceof NbtByte)         return 1;
    if (tag instanceof NbtShort)        return 2;
    if (tag instanceof NbtInt)          return 3;
    if (tag instanceof NbtLong)         return 4;
    if (tag instanceof NbtFloat)        return 5;
    if (tag instanceof NbtDouble)       return 6;
    if (tag instanceof NbtByteArray)    return 7;
    if (tag instanceof NbtString)       return 8;
    if (tag instanceof NbtList)         return 9;
    if (tag instanceof NbtCompound)     return 10;
    if (tag instanceof NbtIntArray)     return 11;
    if (tag instanceof NbtLongArray)    return 12;
    throw new Error("Unknown tag: " + tag);
}

export async function writeNbt(nbt: NbtData): Promise<Blob> {
    const writer = new NbtWriter(new Uint8Array(100), nbt.editionData.littleEndian);

    // Write extra data for bedrock edition level.dat
    let bedrockLevelData: BedrockLevelDat;
    if (nbt.editionData.edition == "bedrock") {
        const bedrockData = nbt.editionData as BedrockEdition;
        if (bedrockData.isLevelDat) {
            bedrockLevelData = bedrockData as BedrockLevelDat;
        }
    }
    if (bedrockLevelData != null) {
        // Write header
        writer.write4(bedrockLevelData.headerVersion);
        // Byte length is written later
        writer.write4(0);
    }

    const tag = nbt.tag;
    writer.writeU1(getIdFromTag(tag));
    writer.writeString("");
    tag.write(writer);

    if (bedrockLevelData != null) {
        // Write byte length
        const length = writer.index;
        writer.index = 4;
        writer.write4(length - 8);
        writer.index = length;
    }

    let data = writer.bytes;

    // Trim to size
    const newData = new Uint8Array(writer.index);
    for (let i = 0; i < writer.index; i++) {
        newData[i] = data[i];
        // this feels very inefficent, although couldn't get other set/copyWithin
        // methods to work
    }
    data = newData;

    if (nbt.compression != "none") {
        // pako will auto detect the algorithm
        await ensurePakoScriptIsLoaded();
        if (nbt.compression == "gzip") {
            // @ts-ignore
            data = pako.gzip(data);
        } else if (nbt.compression == "zlib") {
            // @ts-ignore
            data = pako.deflate(data);
        }
    }

    return new Blob([data]);
}