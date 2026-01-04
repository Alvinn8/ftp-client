import FolderEntry, { FolderEntryType } from "../common/folder/FolderEntry";
import FTPConnection from "../common/ftp/FTPConnection";
import { addMessage } from "../common/ui/messages";
import { blobToBase64, ensureAbsolute, filename, sleep } from "../common/utils";
import { ChunkedUploadResponse, ConnectData, ConnectReply, ErrorReply, Packet, Packets } from "../protocol/packets";
import { LargeFileOperationInterface, largeFileOperationStore } from "../common/ui/LargeFileOperation";
import Dialog from "../common/Dialog";
import TaskManager from "../common/task/TaskManager";
import { assertUnreachable, CancellationError, ConnectionClosedError, FTPError, SFTPError } from "../common/error";
import { getConfig } from "../common/config/config";

interface PendingReply {
    requestId: string;
    handler: (data: any) => void;
    reject: (error: Error) => void;
};

export const PROTOCOL_TYPE = "json";
export const PROTOCOL_VERSION  = 1;

const LARGE_FILE_THRESHOLD = 10E6; // 10 MB

async function attemptRequest() {
    const response = await fetch(getConfig().websocket_url.replace(/^ws/, "http"));
    if (response.status != 200) {
        throw new Error("Non 200 response: " + response.status);
    }
}

export async function pingBackend() {
    let err: unknown;
    let attempts = 0;
    while (attempts < 5) {
        try {
            attempts++;
            await attemptRequest();
            // No error yet? Nice, return
            return;
        } catch (err) {
            console.log("Request failed, trying again in 5 seconds. Attempt: " + attempts);
            await sleep(5000);
            err = err;
        }
    }
    throw err;
}

function progressTracker(type: "download" | "upload", path: string, progress?: (value: number, max: number) => void) {
    return (event: ProgressEvent) => {
        const op: LargeFileOperationInterface = {
            type,
            fileName: filename(path),
            hasProgress: false,
            loaded: 0,
            total: 0
        };
        if (event.lengthComputable) {
            op.hasProgress = true;
            op.loaded = event.loaded;
            op.total = event.total;
            if (progress) {
                progress(event.loaded, event.total);
            }
        }
        if (!progress) {
            largeFileOperationStore.setValue(op);
        }
    };
}

/**
 * An implementation of {@link FTPConnection} that connects to a websocket server
 * to send FTP requests.
 * 
 * The websocket server being connected to should be the one created by the code in
 * the src/server folder.
 */
export default class WebsocketFTPConnection implements FTPConnection {
    public websocket: WebSocket;
    private readonly pendingReplies: PendingReply[] = [];
    private closing: boolean = false;

    /**
     * Connect to the websocket.
     */
    async connectToWebsocket() {
        if (navigator.onLine === false || await pingBackend().then(() => true).catch(() => false) === false) {
            console.log('navigator.onLine', navigator.onLine, new Error().stack);
            const confirmed = await Dialog.confirm(
                "No internet connection",
                `It appears you are not connected to the internet, or ${getConfig().branding.appName} is experiencing
                downtime. Double check your internet connection and press "Continue" when you are online.`,
                "Cancel",
                "Continue"
            );
            if (!confirmed) {
                throw new CancellationError("No internet connection, and the user decided to cancel.");
            }
        }

        await new Promise<void>((resolve, reject) => {
            this.websocket = new WebSocket(getConfig().websocket_url);
            this.websocket.addEventListener("message", e => {
                const json = JSON.parse(e.data);
                const requestId = json.requestId;
                for (let i = this.pendingReplies.length - 1; i >= 0; i--) {
                    const pendingReply = this.pendingReplies[i];
                    if (pendingReply.requestId == requestId) {
                        pendingReply.handler(json);
                        this.pendingReplies.splice(i, 1);
                    }
                }
            });
            this.websocket.addEventListener("open", () => {
                this.websocket.send(`handshake ${PROTOCOL_TYPE} ${PROTOCOL_VERSION}`);
                resolve();
            });
            this.websocket.addEventListener("error", (e) => {
                addMessage({
                    color: "danger",
                    message: "Connection error",
                    stayForMillis: 5000
                });
                console.log("WebSocket connection error", e)
                this.rejectPendingReplies(new Error("WebSocket connection error"));
                reject(new Error("WebSocket connection error"));
            });
            this.websocket.addEventListener("close", e => {
                let message = "Connection closed";
                // While 1006 is an abnormal close, it happens very frequently and doesn't
                // matter since it will reconnect. There is no need to worry the user that
                // something abnormal happened, since it is, in fact, very normal.
                if (e.code != 1000 && e.code != 1005 && e.code != 1006) message = "Connection closed: " + e.code + " " + e.reason;
                
                this.rejectPendingReplies(new ConnectionClosedError(message, e.code, e.reason));
                
                const hasTask = TaskManager.hasTask() || TaskManager.getTreeTasks().length > 0;
                if (message == "Connection closed" && (!hasTask || this.closing)) return;
                addMessage({
                    color: "danger",
                    message: message,
                    stayForMillis: 5000
                });
            });
        });
    }

    async send<Data, Response>(packet: Packet<Data, Response>, data: Data): Promise<Response> {
        return await new Promise<Response>((resolve, reject) => {
            data["packetId"] = packet.id;
            data["packetName"] = packet.name;
            const requestId = this.getRandomId();
            data["requestId"] = requestId;
            this.pendingReplies.push({
                requestId,
                reject,
                handler: (data: Response | ErrorReply) => {
                    if (typeof data === "object" && data !== null && "action" in data && data.action == "error") {
                        if (data.message == "Not connected") {
                            this.websocket.close();
                        }
                        let error: Error;
                        if (data.type === "FTPError") {
                            error = new FTPError(data.message, typeof data.code === "number" ? data.code : 0);
                        } else if (data.type === "SFTPError") {
                            error = new SFTPError(data.message, data.code || "UNKNOWN");
                        } else if (data.type === "Error") {
                            error = new Error(data.message);
                        } else {
                            assertUnreachable(data.type);
                        }
                        console.log(error);
                        reject(error);
                    }
                    else resolve(data as Response);
                },
            });
            this.websocket.send(JSON.stringify(data));
        });
    }

    getRandomId(): string {
        return Math.random().toString().substring(2);
    }

    private rejectPendingReplies(error: Error) {
        for (const pendingReply of this.pendingReplies) {
            pendingReply.reject(error);
        }
    }

    /** @deprecated */
    async connectToFtp(host: string, port: number, username: string, password: string, secure: boolean): Promise<void> {
        await this.send(Packets.ConnectFtp, {
            host, port, username, password, secure
        });
    }

    /** @deprecated */
    async connectToSftp(host: string, port: number, username: string, password: string): Promise<void> {
        await this.send(Packets.ConnectSftp, {
            host, port, username, password
        });
    }

    async connect(data: ConnectData): Promise<ConnectReply> {
        return await this.send(Packets.Connect, data);
    }

    async isConnected(): Promise<boolean> {
        const response = await this.send(Packets.Ping, {});
        return response.isConnected;
    }

    close(): void {
        this.closing = true;
        this.websocket.close();
    }

    async list(path: string): Promise<FolderEntry[]> {
        ensureAbsolute(path);

        let directoryPath = path;
        if (!directoryPath.endsWith("/")) {
            directoryPath += "/";
        }
        return (await this.send(Packets.List, { path }))
            .files
            .map(fileInfo => {
                const folderEntryPath = directoryPath + fileInfo.name;
                return new FolderEntry(
                    folderEntryPath,
                    fileInfo.name,
                    fileInfo.size,
                    fileInfo.type as number as FolderEntryType,
                    fileInfo.rawModifiedAt
                );
            });
    }

    private keepAlive(xhr: XMLHttpRequest) {
        // It is very important that the connection to the FTP server isn't closed
        // while we are downloading large files over HTTP. Since the websocket
        // connection isn't used for this process, we need to ensure the connection
        // isn't closed, because closing the connection causes the FTP connection
        // to close.
        // We therefore send ping messages during the upload or download.
        const intervalId = setInterval(() => {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                console.log("Stopped pinging.");
                clearInterval(intervalId);
                return;
            }
            // Send a ping request
            console.log("Pinging");
            this.isConnected().then(val => {
                if (!val) {
                    console.warn("FTP not connected while still downloading.");
                }
            }).catch(e => {
                console.error("Failed to ping", e);
            });
        }, 5000);
    }

    async download(folderEntry: FolderEntry, progress?: (value: number, max: number) => void): Promise<Blob> {
        ensureAbsolute(folderEntry.path);

        const response = await this.send(Packets.Download, {
            path: folderEntry.path,
            largeDownload: folderEntry.size > LARGE_FILE_THRESHOLD
        });
        if (response.downloadId) {
            const url = getConfig().websocket_url.replace(/^ws/, "http") + "/download/" + response.downloadId;
            return await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.responseType = "blob";
                xhr.addEventListener("progress", progressTracker("download", folderEntry.path, progress));
                xhr.addEventListener("readystatechange", event => {
                    if (xhr.readyState === XMLHttpRequest.DONE) {
                        if (xhr.status === 200 && xhr.response instanceof Blob) {
                            resolve(xhr.response as Blob);
                            largeFileOperationStore.setValue(null);
                        } else {
                            largeFileOperationStore.setValue(null);
                            reject(new Error(`Failed to download large file. HTTP ${xhr.status} ${xhr.statusText}`));
                        }
                    }
                });
                xhr.addEventListener("error", event => {
                    largeFileOperationStore.setValue(null);
                    reject(new Error("Network error while downloading large file"));
                })
                xhr.open("GET", url);
                xhr.send();
                this.keepAlive(xhr);
            });
        } else if (response.data || response.data === '') {
            const base64 = response.data;
            const binarystring = atob(base64);
            const arraybuffer = new Uint8Array(binarystring.length);
            for (let i = 0; i < binarystring.length; i++) {
                arraybuffer[i] = binarystring.charCodeAt(i);
            }
            return new Blob([arraybuffer], { type: "application/octet-stream" });
        } else {
            throw new Error("Failed to download (no proper response)");
        }
    }

    async uploadSmall(blob: Blob, path: string): Promise<void> {
        ensureAbsolute(path);
        const base64 = await blobToBase64(blob);

        await this.send(Packets.Upload, {
            path: path,
            data: base64
        });
    }

    async startChunkedUpload(path: string, size: number, startOffset: number | null): Promise<string> {
        ensureAbsolute(path);
        const { uploadId } = await this.send(Packets.ChunkedUploadStart, {
            path,
            size,
            startOffset
        });
        return uploadId;
    }

    async uploadChunk(uploadId: string, chunk: Blob, start: number, end: number): Promise<ChunkedUploadResponse> {
        const base64 = await blobToBase64(chunk);
        return await this.send(Packets.ChunkedUpload, {
            uploadId,
            data: base64,
            start,
            end
        });
    }

    async stopChunkedUpload(uploadId: string): Promise<void> {
        await this.send(Packets.ChunkedUploadStop, { uploadId });
    }

    async mkdir(path: string): Promise<void> {
        ensureAbsolute(path);
        await this.send(Packets.Mkdir, { path });
    }

    async rename(from: string, to: string): Promise<void> {
        ensureAbsolute(from);
        ensureAbsolute(to);
        await this.send(Packets.Rename, { from, to });
    }

    async delete(path: string): Promise<void> {
        ensureAbsolute(path);
        await this.send(Packets.Delete, { path });
    }
}