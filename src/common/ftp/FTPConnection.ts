import FolderEntry from "../folder/FolderEntry";

/**
 * A connection to the FTP server. An FTPConnection is the main thing used for
 * communicating with the FTP server to download, upload, list files, etc.
 * <p>
 * Most of the time changing the directory should although be done via the
 * FTPSession as that will respect the cache and will be faster. But in some cases
 * like when a recursing task is being made, it might be better to change the
 * directory directly via the FTPConnection. But be very careful when doing that
 * and make sure the directory is reset back to what it was before the task started,
 * otherwise the application will desync the directory it is currently in.
 */
export default interface FTPConnection {
    connect(host: string, port: number, username: string, password: string, secure: boolean): Promise<void>;
    isConnected(): Promise<boolean>;
    
    list(path?: string): Promise<FolderEntry[]>;
    pwd(): Promise<string>;
    cd(path: string): Promise<void>;
    cdup(): Promise<void>;
    download(path: string): Promise<Blob>;
    upload(blob: Blob, path: string): Promise<void>;
    mkdir(path: string): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    delete(path: string): Promise<void>;
}