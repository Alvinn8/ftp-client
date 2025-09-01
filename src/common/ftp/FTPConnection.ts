import { ChunkedUploadResponse } from "../../protocol/packets";
import FolderEntry from "../folder/FolderEntry";

/**
 * A connection to the FTP server. An FTPConnection is used for communicating with
 * the FTP server to download, upload, list files, etc.
 */
export default interface FTPConnection {
    connect(host: string, port: number, username: string, password: string, secure: boolean): Promise<void>;
    isConnected(): Promise<boolean>;
    close(): void;

    list(path: string): Promise<FolderEntry[]>;
    download(folderEntry: FolderEntry, progress?: (value: number, max: number) => void): Promise<Blob>;
    uploadSmall(blob: Blob, path: string): Promise<void>;
    startChunkedUpload(path: string, size: number, startOffset: number | null): Promise<string>;
    uploadChunk(uploadId: string, chunk: Blob, start: number, end: number): Promise<ChunkedUploadResponse>;
    stopChunkedUpload(uploadId: string): Promise<void>;
    mkdir(path: string): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    delete(path: string): Promise<void>;
}