import FolderEntry, { FolderEntryType } from "../common/folder/FolderEntry";
import FTPConnection from "../common/ftp/FTPConnection";
import { addMessage } from "../common/ui/messages";
import { blobToBase64, dirname, ensureAbsolute, filename } from "../common/utils";
import { Packet, Packets } from "../protocol/packets";
import {LargeFileOperationInterface, largeFileOperationStore} from "../common/ui/LargeFileOperation";
import Dialog from "../common/Dialog";

interface PendingReply {
    requestId: string;
    handler: (data: any) => void;
};

export const PROTOCOL_TYPE = "json";
export const PROTOCOL_VERSION  = 1;

const LARGE_FILE_THRESHOLD = 10E6; // 10 MB

const CHUNK_SIZES = [
    512 * 1024, // 512 kB
    2 * 1024 * 1024, // 2 MB
    8 * 1024 * 1024, // 8 MB
];
const DEFAULT_CHUNK_SIZE = CHUNK_SIZES[0];
const DECREASE_CHUNK_SIZE_THRESHOLD = 5000; // 5 s
const INCREASE_CHUNK_SIZE_THRESHOLD = 500; // 500 ms

/**
 * The URL to the websocket to connect to.
 */
export const WEBSOCKET_URL = location.hostname == "ftp-client.alvinn8.repl.co" ? "wss://ftp-client-ws.alvinn8.repl.co" : location.protocol.replace("http", "ws") + "//" + location.hostname + ":8081";

let attempts = 0;
async function attemptRequest() {
    attempts++;
    const response = await fetch(WEBSOCKET_URL.replace(/^ws/, "http"));
    if (response.status != 200) {
        throw new Error("Non 200 response: " + response.status);
    }
}

function sleep(ms) {
    return new Promise(function(resolve, reject) {
        setTimeout(resolve, ms);
    });
}

export const connectionPromise = new Promise<void>(async function(resolve, reject) {
    while (attempts < 5) {
        try {
            await attemptRequest();
            // No error yet? Nice, resolve
            resolve();
            return;
        } catch {
            console.log("Request failed, trying again in 5 seconds. Attempt: " + attempts);
            await sleep(5000);
        }
    }
    reject();
});
connectionPromise.catch(function(e) {
    addMessage({
        color: "danger",
        message: "Failed to connect to the server.",
        stayForMillis: 30000
    });
    throw e;
});
window["connectionPromise"] = connectionPromise;

function progressTracker(type: "download" | "upload", path: string) {
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
        }
        largeFileOperationStore.setValue(op);
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

    /**
     * Connect to the websocket.
     */
    async connectToWebsocket() {
        // Ensure the server is ready
        await connectionPromise;

        await new Promise<void>((resolve, reject) => {
            this.websocket = new WebSocket(WEBSOCKET_URL);
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
                    message: "Connection error: " + e,
                    stayForMillis: 5000
                });
                reject(e);
            });
            this.websocket.addEventListener("close", e => {
                let message = "Connection closed";
                // While 1006 is an abnormal close, it happens very frequently and doesn't
                // matter since it will reconnect. There is no need to worry the user that
                // something abnormal happened, since it is, in fact, very normal.
                if (e.code != 1000 && e.code != 1006) message = "Connection closed: " + e.code + " " + e.reason;
                addMessage({
                    color: "danger",
                    message: message,
                    stayForMillis: 5000
                });
            });
        });
    }

    send<Data, Response>(packet: Packet<Data, Response>, data: Data): Promise<Response> {
        return new Promise<Response>((resolve, reject) => {
            data["packetId"] = packet.id;
            const requestId = this.getRandomId();
            data["requestId"] = requestId;
            this.pendingReplies.push({
                requestId,
                handler: function (data) {
                    if (data.action == "error") {
                        addMessage({
                            color: "danger",
                            message: data.message,
                            stayForMillis: 10000
                        });
                        reject(new Error(data.message));
                    }
                    else resolve(data);
                }
            });
            this.websocket.send(JSON.stringify(data));
        });
    }

    getRandomId(): string {
        return Math.random().toString().substring(2);
    }

    async connect(host: string, port: number, username: string, password: string, secure: boolean): Promise<void> {
        await this.send(Packets.Connect, {
            host, port, username, password, secure
        });
    }

    async isConnected(): Promise<boolean> {
        const response = await this.send(Packets.Ping, {});
        return response.isFTPConnected;
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

    async pwd(): Promise<string> {
        const reply = await this.send(Packets.PWD, {});
        return reply.workdir;
    }

    async cd(path: string): Promise<void> {
        await this.send(Packets.CD, { path });
    }

    async cdup(): Promise<void> {
        await this.send(Packets.CDUP, {});
    }

    private async keepAlive(xhr: XMLHttpRequest) {
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
                    console.warn("FTP not connected while still uploading.");
                }
            }).catch(e => {
                console.error("Failed to ping", e);
            });
        }, 5000);
    }

    async download(folderEntry: FolderEntry): Promise<Blob> {
        ensureAbsolute(folderEntry.path);

        const response = await this.send(Packets.Download, {
            path: folderEntry.path,
            largeDownload: folderEntry.size > LARGE_FILE_THRESHOLD
        });
        if (response.downloadId) {
            const url = WEBSOCKET_URL.replace(/^ws/, "http") + "/download/" + response.downloadId;
            return await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.responseType = "blob";
                xhr.addEventListener("progress", progressTracker("download", folderEntry.path));
                xhr.addEventListener("readystatechange", event => {
                    if (xhr.readyState === XMLHttpRequest.DONE) {
                        resolve(xhr.response as Blob);
                        largeFileOperationStore.setValue(null);
                    }
                });
                xhr.addEventListener("error", event => {
                    largeFileOperationStore.setValue(null);
                    reject(event);
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

    async upload(blob: Blob, path: string): Promise<void> {
        ensureAbsolute(path);

        if (blob.size > LARGE_FILE_THRESHOLD) {
            const { uploadId } = await this.send(Packets.ChunkedUploadStart, {
                path,
                size: blob.size
            });
            let chunkSize = DEFAULT_CHUNK_SIZE;
            
            let lastStatus = "";
            let offset = 0;
            while (offset < blob.size) {
                const start = offset;
                const end = Math.min(start + chunkSize, blob.size);
                const chunk = blob.slice(start, end);
                const base64 = await blobToBase64(chunk);

                console.log(`Uploading chunk with bytes ${start} to ${end}.`);
                const startTime = performance.now();
                const response = await this.send(Packets.ChunkedUpload, {
                    uploadId,
                    data: base64,
                    start,
                    end
                });
                const status = response.status;
                offset += chunk.size;
                lastStatus = status;
                if (status !== "success" && status !== "end") {
                    // TODO maybe error here straight away?
                    // currently we just let the file size check verify stuff.
                    console.log("Status: " + status);
                    if (status === "error") {
                        console.error(response.error);
                    }
                    break;
                }
                
                // Progress bar
                largeFileOperationStore.setValue({
                    type: "upload",
                    fileName: filename(path),
                    hasProgress: true,
                    loaded: end,
                    total: blob.size
                });

                // Adjust chunk size if applicable
                const endTime = performance.now();
                const ms = endTime - startTime;
                const chunkSizeIndex = CHUNK_SIZES.indexOf(chunkSize);
                if (chunkSizeIndex > 0 && ms > DECREASE_CHUNK_SIZE_THRESHOLD) {
                    // The chunk size can become smaller, and the decrease threshold was reached.
                    chunkSize = CHUNK_SIZES[chunkSizeIndex - 1];
                    console.log(`Chunk took ${Math.round(ms)} ms, decreasing chunk size.`);
                 } else if (chunkSizeIndex < CHUNK_SIZES.length - 1 && ms < INCREASE_CHUNK_SIZE_THRESHOLD) {
                    // The chunk size can become bigger, and the increase threshold was reached.
                    chunkSize = CHUNK_SIZES[chunkSizeIndex + 1];
                    console.log(`Chunk took ${Math.round(ms)} ms, increasing chunk size.`);
                } else {
                    console.log(`Chunk took ${Math.round(ms)} ms, chunk size is good.`);
                }
            }

            // Verify file size
            const listResult = await this.send(Packets.List, {
                path: dirname(path)
            });
            largeFileOperationStore.setValue(null);
            const fileName = filename(path);
            const fileInfo = listResult.files.find(f => f.name === fileName);
            if (!fileInfo) {
                await (new Promise<void>(resolve => {
                    Dialog.message("Upload failed", "Unknown error", () => resolve());
                }));
                throw new Error("Chunked upload failed.");
            } else if (fileInfo.size !== blob.size) {
                await (new Promise<void>(resolve => {
                    Dialog.message(
                        "Partial upload failed",
                        `The file at ${path} failed to upload properly and might have corrupted due to
                        only part of the file being uploaded correctly. Only ${Math.round(fileInfo.size / 1E6)} MB out of
                        ${Math.round(blob.size / 1E6)} were actually uploaded. Please delete ${path} and try to
                        upload it again. Last chunk status: ${lastStatus}`,
                        () => resolve()
                    );
                }));
                throw new Error("Chunked upload failed."); // TODO retry for grouped uploads and such
            }
        } else {
            const base64 = await blobToBase64(blob);

            await this.send(Packets.Upload, {
                path: path,
                data: base64
            });
        }
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