import NbtReader from "./NbtReader";
import NbtData, { BedrockEdition, BedrockLevelDat, Compression, EditionData } from "./NbtData";
import { NbtByte, NbtByteArray, NbtCompound, NbtDouble, NbtEnd, NbtFloat, NbtInt, NbtIntArray, NbtList, NbtLong, NbtLongArray, NbtShort, NbtString, NbtTag } from "./nbtTags";
import NbtWriter from "./NbtWriter";
import { inflate, gzip, ungzip, deflate } from "pako";

export async function readNbt(blob: Blob): Promise<NbtData> {
    let data = new Uint8Array(await blob.arrayBuffer());

    let compression: Compression = null;
    let editionData: EditionData;
    let tag: NbtTag;

    if (data[0] == 0x1F && data[1] == 0x8B) {
        // gzip magic number 1F 8B
        compression = {
            type: "gzip",
            headerOperatingSystem: data[9]
        };
        console.log("OS in gzip header is:", compression.headerOperatingSystem);
        data = ungzip(data);
    }
    else if (data[0] == 0x78) {
        // zlib magic number 0x78
        compression = { type: "zlib" };
        data = inflate(data);
    }

    const reader = new NbtReader(data);

    // Bedrock edition level.dat?
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
        if (reader.isAtEnd()) {
            return { tag, compression, editionData };
        }
    }

    // Java edition?
    editionData = {
        edition: "java",
        littleEndian: false
    };
    reader.littleEndian = false;
    reader.index = 0;
    tag = await attemptReadNbtTag(reader);
    if (tag != null && reader.isAtEnd()) {
        return { tag, compression, editionData };
    }

    // Bedrock edition?
    editionData = {
        edition: "bedrock",
        littleEndian: true
    };
    reader.littleEndian = true;
    reader.index = 0;
    tag = await attemptReadNbtTag(reader);
    if (tag != null && reader.isAtEnd()) {
        return { tag, compression, editionData };
    }

    throw new Error("That is not an nbt file.");
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

    if (nbt.compression != null) {
        if (nbt.compression.type == "gzip") {
            // There is an operating system field in the gzip header.
            // We want to set it to the same value as in the original file.
            // This means that if nothing is changed, our NBT reader and
            // writer will produce a byte-for-byte identical file when nothing
            // is changed.
            // Pako supports setting the operating system field, but it's not
            // exposed in the types as it is treated as internal API.
            const os = nbt.compression.headerOperatingSystem;

            data = gzip(data, { header: { os } } as any);
        } else if (nbt.compression.type == "zlib") {
            data = deflate(data);
        }
    }

    return new Blob([data]);
}

/**
 * Validate that the nbt was parsed correctly and that it can be serialized
 * correctly back to the same bytes that were originally read.
 */
export async function validateNbtParsing(originalBlob: Blob, nbt: NbtData, strict: boolean = false): Promise<boolean> {
    const serializedNbt = await writeNbt(nbt);
    const originalBytes = new Uint8Array(await originalBlob.arrayBuffer());
    const serializedBytes = new Uint8Array(await serializedNbt.arrayBuffer());
    const compressionName = nbt.compression ? nbt.compression.type : "none";
    if (await arrayBuffersEqual(originalBytes, serializedBytes)) {
        console.log("Passed test directly with compression " + compressionName);
        return true;
    }
    if (nbt.compression !== null && !strict) {
        try {
            // The nbt may be the same, but the compression may be different.
            // Let's try inflating the file and see if they are equal when inflated.
            const inflatedOriginalBytes = inflate(originalBytes);
            const inflatedSerializedBytes = inflate(serializedBytes);
            if (await arrayBuffersEqual(inflatedOriginalBytes, inflatedSerializedBytes)) {
                console.log("Passed test after inflating with compression " + compressionName);
                return true;
            }
        } catch (e) {
            console.log("Failed to inflate with compression " + compressionName + ": " + e);
        }
    }
    console.log("Failed test with compression " + compressionName);
    return false;
}

async function arrayBuffersEqual(array1: Uint8Array, array2: Uint8Array): Promise<boolean> {
    return array1.byteLength == array2.byteLength && array1.every((value, index) => value == array2[index]);
}

/**
 * Santify check that the nbt serialized as the blob is valid and produces the
 * expected nbt. We at all costs want to avoid corrupting the nbt when saving.
 */
export async function sanityCheckNbt(blob: Blob, nbt: NbtData): Promise<void> {
    // Try to read the nbt again from the blob and ensure that it is valid nbt.
    // If this throws an error while parsing, we know that the nbt is not valid.
    let parsedNbt: NbtData;
    try {
        parsedNbt = await readNbt(blob);
    } catch (e) {
        throw new Error("The serialized NBT file is not valid NBT. Error: " + e);
    }

    // We do not have a way to compare the two nbt objects, so we just check that
    // the serialized nbt that was deserialized can be serialized again and provide
    // the same bytes. We use the function above to check this.
    // In this case we use the strict mode. This is because the compression was
    // performed by pako, and should be consistent across different runs.
    // We therefore compare the compressed bytes and ensure they are identical.
    if (!(await validateNbtParsing(blob, parsedNbt, true))) {
        throw new Error("The serialized NBT file did not pass validation.");
    }
}
