import type { FileType } from "../../node_modules/basic-ftp/dist/FileInfo";

export interface ConnectData {
    host: string;
    port: number;
    username: string;
    password: string;
    secure: boolean;
}

export interface ErrorReply {
    action: "error";
    message: string;
}

export interface PingReply {
    isFTPConnected: boolean;
};

export interface CdData {
    path: string;
}

export interface FileInfo {
    name: string;
    size: number;
    type: FileType;
    rawModifiedAt: string;
}

export interface ListData {
    path: string;
}

export interface ListReply {
    files: FileInfo[]
}

export interface PWDReply {
    workdir: string;
}

export interface PathData {
    path: string;
}

export interface DownloadData {
    path: string;
    largeDownload: boolean;
}

export interface DownloadReply {
    data?: string;
    downloadId?: string;
}

export interface UploadData {
    path: string;
    data: string;
}

export interface RenameData {
    from: string;
    to: string;
}

export interface LargeUploadResponse {
    uploadId: string;
}

export interface ChunkedUploadStartData {
    path: string;
    /** The total size in bytes of the file to upload. */
    size: number;
    /** If present, append to an existing file at the specified start offset. */
    startOffset: number | null;
}

export interface ChunkedUploadStartResponse {
    uploadId: string;
}

export interface ChunkedUploadData {
    uploadId: string;
    /** Base64-encoded chunk data. */
    data: string;
    /** The inclusive start byte offset in the file for this chunk. */
    start: number;
    /** The exclusive end byte offset in the file for this chunk. */
    end: number;
}
/**
 * success: The chunk has been scheduled to uploaded successfully, proceed to next chunk.
 * end: The upload has been completed.
 * desync: This chunk did not arrive in correct order.
 * 404: No upload was found for the provided uploadId.
 * malsized: The start and end byte offsets did not align with the size of the chunk.
 * hijack: The upload was started by a different connection than this one.
 * error: A previous chunk failed to upload to the server.
 */
export type ChunkedUploadStatus = "success" | "end" | "desync" | "404" | "malsized" | "hijack" | "error";
export interface ChunkedUploadResponse {
    status: ChunkedUploadStatus;
    error?: string;
}

export const packetMap = new Map<number, Packet<any, any>>();

let idCount = 1;

/**
 * A packet where {@code Data} is the type the client needs to send with the packet
 * and where {@code Response} is the type the server replies with.
 */
export class Packet<Data, Response> {
    public readonly id;

    constructor() {
        this.id = idCount++;
        packetMap.set(this.id, this);
    }
}

export namespace Packets {
    export const Ping = new Packet<{}, PingReply>();
    export const Connect = new Packet<ConnectData, void>();
    export const List = new Packet<ListData, ListReply>();
    export const PWD = new Packet<{}, PWDReply>();
    export const CD = new Packet<CdData, void>();
    export const CDUP = new Packet<{}, void>();
    export const Download = new Packet<DownloadData, DownloadReply>();
    export const Upload = new Packet<UploadData, void>();
    export const Mkdir = new Packet<PathData, void>();
    export const Rename = new Packet<RenameData, void>();
    export const Delete = new Packet<PathData, void>();
    /** @deprecated Use chunked uploads */
    export const LargeUpload = new Packet<PathData, LargeUploadResponse>();
    export const ChunkedUploadStart = new Packet<ChunkedUploadStartData, ChunkedUploadStartResponse>();
    export const ChunkedUpload = new Packet<ChunkedUploadData, ChunkedUploadResponse>();
}