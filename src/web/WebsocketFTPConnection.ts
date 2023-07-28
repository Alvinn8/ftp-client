import FolderEntry, { FolderEntryType } from "../common/folder/FolderEntry";
import FTPConnection from "../common/ftp/FTPConnection";
import { addMessage } from "../common/ui/messages";
import { ensureAbsolute } from "../common/utils";
import { Packet, Packets } from "../protocol/packets";
import {LargeFileOperationInterface, largeFileOperationStore} from "../common/ui/LargeFileOperation";

interface PendingReply {
    requestId: string;
    handler: (data: any) => void;
};

export const PROTOCOL_TYPE = "json";
export const PROTOCOL_VERSION  = 1;

const LARGE_FILE_THRESHOLD = 10E6; // 10 MB

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
            fileName: path.substring(path.lastIndexOf('/') + 1),
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
                if (e.code == 1006) message = "Connection closed abnormally";
                else if (e.code != 1000) message = "Connection closed: " + e.code + " " + e.reason;
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
            });
        } else if (response.data) {
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
            const { uploadId } = await this.send(Packets.LargeUpload, {
                path
            });
            const url = WEBSOCKET_URL.replace(/^ws/, "http") + "/upload/" + uploadId;
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.addEventListener("readystatechange", event => {
                    if (xhr.readyState === XMLHttpRequest.DONE) {
                        resolve();
                        largeFileOperationStore.setValue(null);
                    }
                });
                xhr.addEventListener("error", (event) => {
                    largeFileOperationStore.setValue(null);
                    reject(event);
                });
                xhr.open("POST", url);
                if (xhr.upload) {
                    xhr.upload.addEventListener("progress", progressTracker("upload", path));
                }
                xhr.send(blob);
            });
        } else {
            const base64 = await (new Promise<string>(function(resolve, reject) {
                const reader = new FileReader();
                reader.onload = function() {
                    const dataURL = (reader.result as string);
                    resolve(dataURL.substring(dataURL.indexOf(",") + 1));
                }
                reader.onerror = function () {
                    reject("Failed to read file to upload.");
                };
                reader.readAsDataURL(blob);
            }));

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