import { NbtTag } from "./nbtTags";


export default interface NbtData {
    tag: NbtTag;
    editionData: EditionData;
    compression: Compression;
}

export type GzipCompression = {
    type: "gzip";
    headerOperatingSystem: number;
};
export type ZlibCompression = { type: "zlib" };
export type Compression = GzipCompression | ZlibCompression | null;

export interface EditionData {
    edition: Edition;
    littleEndian: boolean;
}

export type Edition = "java" | "bedrock";

export interface JavaEdition extends EditionData {
    edition: "java";
    littleEndian: false;
}

export interface BedrockEdition extends EditionData {
    edition: "bedrock";
    littleEndian: true;
    isLevelDat: boolean;
}

export interface BedrockLevelDat extends BedrockEdition {
    isLevelDat: true;
    headerVersion: number;
}