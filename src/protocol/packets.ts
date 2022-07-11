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

export interface DownloadReply {
    data: string;
}

export interface UploadData {
    path: string;
    data: string;
}

export interface RenameData {
    from: string;
    to: string;
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
    export const Download = new Packet<PathData, DownloadReply>();
    export const Upload = new Packet<UploadData, void>();
    export const Mkdir = new Packet<PathData, void>();
    export const Rename = new Packet<RenameData, void>();
    export const Delete = new Packet<PathData, void>();
}