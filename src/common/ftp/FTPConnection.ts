import FolderEntry from "../folder/FolderEntry";

/**
 * A connection to the FTP server. An FTPConnection is used for communicating with
 * the FTP server to download, upload, list files, etc.
 */
export default interface FTPConnection {
    connect(host: string, port: number, username: string, password: string, secure: boolean): Promise<void>;
    isConnected(): Promise<boolean>;

    list(path: string): Promise<FolderEntry[]>;
    /** @deprecated */
    pwd(): Promise<string>;
    /** @deprecated */
    cd(path: string): Promise<void>;
    /** @deprecated */
    cdup(): Promise<void>;
    download(path: string): Promise<Blob>;
    upload(blob: Blob, path: string): Promise<void>;
    mkdir(path: string): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    delete(path: string): Promise<void>;
}