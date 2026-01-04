import type { FileType } from "../../node_modules/basic-ftp/dist/FileInfo";

export interface ConnectFtpData {
    host: string;
    port: number;
    username: string;
    password: string;
    secure: boolean;
}

export interface ConnectSftpData {
    host: string;
    port: number;
    username: string;
    password: string;
}

export type ConnectData = {
    protocol: string;
    [key: string]: any;
}

export type ConnectReply = {
    readOnly: boolean;
}

export interface ErrorReply {
    action: "error";
    type: "Error" | "FTPError" | "SFTPError";
    code?: string | number;
    message: string;
}

export interface PingReply {
    isConnected: boolean;
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

export interface ChunkedUploadStopData {
    uploadId: string;
}

export const packetMap = new Map<number, Packet<any, any>>();
export const packetNameMap = new Map<string, Packet<any, any>>();

let idCount = 1;

/**
 * A packet where {@code Data} is the type the client needs to send with the packet
 * and where {@code Response} is the type the server replies with.
 */
export class Packet<Data, Response> {
    public readonly id: number;
    public readonly name: string;

    constructor(name: string) {
        this.id = idCount++;
        this.name = name;
        packetMap.set(this.id, this);
        packetNameMap.set(this.name, this);
    }
}

export namespace Packets {
    export const Ping = new Packet<{}, PingReply>("ping");
    /** @deprecated */
    export const ConnectFtp = new Packet<ConnectFtpData, void>("connect_ftp");
    /** @deprecated */
    export const ConnectSftp = new Packet<ConnectSftpData, void>("connect_sftp");
    export const List = new Packet<ListData, ListReply>("list");
    export const Download = new Packet<DownloadData, DownloadReply>("download");
    export const Upload = new Packet<UploadData, void>("upload");
    export const Mkdir = new Packet<PathData, void>("mkdir");
    export const Rename = new Packet<RenameData, void>("rename");
    export const Delete = new Packet<PathData, void>("delete");
    export const ChunkedUploadStart = new Packet<ChunkedUploadStartData, ChunkedUploadStartResponse>("chunked_upload_start");
    export const ChunkedUpload = new Packet<ChunkedUploadData, ChunkedUploadResponse>("chunked_upload");
    export const ChunkedUploadStop = new Packet<ChunkedUploadStopData, void>("chunked_upload_stop");
    export const Connect = new Packet<ConnectData, ConnectReply>("connect");
}