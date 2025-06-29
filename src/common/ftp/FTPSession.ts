import FTPConnection from "./FTPConnection";
import FTPProfile from "./FTPProfile";
import FolderEntry from "../folder/FolderEntry";
import WebsocketFTPConnection from "../../web/WebsocketFTPConnection";
import { addMessage } from "../ui/messages";
import FTPRequest from "./FTPRequest";
import { sleep } from "../utils";

/**
 * An FTP session that holds some information about the current session.
 * <p>
 * The FTP connection is separated from the session so that the session can
 * reconnect using a new connection if required.
 * <p>
 * The session also holds the directory cache.
 */
export default class FTPSession {
    public readonly profile: FTPProfile;
    private connection: FTPConnection;
    public cache: {[key: string]: FolderEntry[]} = {};
    private queue: FTPRequest<any>[] = [];
    private queueLock: string | null = null;
    private bypassLockQueue: FTPRequest<any>[] = [];

    constructor(profile: FTPProfile) {
        this.profile = profile;
    }

    clearCache() {
        this.cache = {};
    }

    clearCacheFor(path: string) {
        const keysToRemove: string[] = [];
        for (let key in this.cache) {
            if (key.startsWith(path)) {
                keysToRemove.push(key);
            }
        }
        for (const key of keysToRemove) {
            delete this.cache[key];
        }
    }

    /**
     * Get the ftp connection with the intention of doing stuff, so the FTPConnection
     * needs to be connected.
     */
    private async getConnection(): Promise<FTPConnection> {
        if (!(this.connection instanceof WebsocketFTPConnection)) {
            return this.connection
        }
        const websocketFTPConnection = this.connection as WebsocketFTPConnection;
        if (websocketFTPConnection.websocket.readyState === WebSocket.OPEN) {
            return this.connection
        }
        // The connection is a websocket and the websocket has closed.
        console.log("Reconnecting websocket");
        addMessage({
            color: "info",
            message: "Reconnecting...",
            stayForMillis: 2000
        });
        let attempt = 0;
        let success = false;
        let lastError: any = null;
        while (attempt < 5) {
            attempt++;
            try {
                // Reconnect the websocket
                await websocketFTPConnection.connectToWebsocket();
                console.log("Websocket reconnected");
                // Check if the ftp is connected.
                const isConnected = await websocketFTPConnection.isConnected();
                if (!isConnected) {
                    console.log("Reconnecting to ftp.");
                    // Reconnect
                    const { host, port, username, password, secure } = this.profile;
                    await websocketFTPConnection.connect(host, port, username, password, secure);
                    console.log("Reconnected to ftp.");
                }
                addMessage({
                    color: "success",
                    message: "Reconnected!",
                    stayForMillis: 2000
                });
                success = true;
                break;
            } catch (err) {
                lastError = err;
                console.log("Failed to get connection, attempt = " + attempt + " error = ", err);
                await sleep(5000);
            }
        }
        if (success) {
            return this.connection;
        } else {
            console.log("Failed to get connection after 5 attempts, lastError =", lastError);
            throw new Error("Failed to connect to ftp-server WebSocket after 5 attempts.", { cause: lastError});
        }
    }

    setConnection(connection: FTPConnection) {
        this.connection = connection;
    }

    disconnect() {
        if (this.connection instanceof WebsocketFTPConnection) {
            const websocketFTPConnection = this.connection as WebsocketFTPConnection;
            console.log("Disconnecting from WebSocket");
            websocketFTPConnection.websocket.close();
        }
    }

    lockQueueNow(lockIdentifier: string) {
        if (this.queueLock !== null) {
            throw new Error(`The queue is locked by ${this.queueLock} but tried to lock by ${lockIdentifier}.`);
        }
        console.log("Locking queue as " + lockIdentifier);
        this.queueLock = lockIdentifier;
    }

    async requestQueueLock(priority: number, lockIdentifier: string): Promise<void> {
        return await this.addToQueue(priority, async () => {
            this.lockQueueNow(lockIdentifier);
            return await Promise.resolve();
        });
    }

    unlockQueue(lockIdentifier: string) {
        if (this.queueLock === null) {
            return;
        }
        if (this.queueLock !== lockIdentifier) {
            throw new Error(`The queue is locked by ${this.queueLock} but tried to unlock with ${lockIdentifier}.`);
        }
        console.log("Unlocking queue from " + lockIdentifier);
        this.queueLock = null;

        // Now that the queue is unlocked, see if we
        // have reqeusts to execute.
        if (this.queue.length > 0) {
            console.log("Running " + this.queue.length + " pending requests now");
            this.executeRequest();
        }
    }

    private getEffectiveQueue(): FTPRequest<any>[] {
        if (this.queueLock === null) {
            return this.queue;
        } else {
            return this.bypassLockQueue;
        }
    }

    private async addToQueue<T>(priority: number, executor: (connection: FTPConnection) => Promise<T> | T, bypassLockIdentifier?: string): Promise<T> {
        return await new Promise((resolve, reject) => {
            const request = new FTPRequest(priority, executor, resolve, reject);
            if (this.queueLock && bypassLockIdentifier === this.queueLock) {
                this.bypassLockQueue.push(request);
                
                // If this was the only request, let's execute it
                if (this.bypassLockQueue.length === 1) {
                    this.executeRequest();
                }
            } else {
                this.queue.push(request);

                // If this was the only request and the queue isn't locked, let's execute it
                if (!this.queueLock && this.queue.length === 1) {
                    this.executeRequest();
                }
            }

            if (!bypassLockIdentifier && this.queueLock) {
                console.log("Added request while queue is locked.");
            }
        });
    }

    private removeFromQueue<T>(request: FTPRequest<T>) {
        const index = this.queue.indexOf(request);
        if (index >= 0) {
            this.queue.splice(index, 1);
        } else {
            const index = this.bypassLockQueue.indexOf(request);
            this.bypassLockQueue.splice(index, 1);
        }

        // This request has finished, are there more in the queue?
        if (this.getEffectiveQueue().length > 0) {
            this.executeRequest();
        }
    }

    private executeRequest() {
        // sort decending, highest priority first
        const queue = this.getEffectiveQueue();
        queue.sort((a, b) => b.priority - a.priority);
        const request = queue[0];

        this.getConnection().then(connection => {
            Promise.resolve(request.executor(connection)).then((t) => {
                request.resolve(t);
                this.removeFromQueue(request);
            }, (err) => {
                request.reject(err);
                this.removeFromQueue(request);
            });
        }, err => {
            // If we reach this point we failed to reconnect and we will not attempt to
            // reconnect again. We therefore need to fail all requests in the queue.
            for (const request of this.queue) {
                request.reject(new Error("Failed to connect.", { cause: err }));
            }
        });
    }

    async list(priority: number, path: string) {
        return await this.addToQueue(priority, async connection => (
            await connection.list(path)
        ));
    }

    async download(priority: number, folderEntry: FolderEntry) {
        return await this.addToQueue(priority, async connection => (
            await connection.download(folderEntry)
        ))
    }

    async uploadSmall(priority: number, blob: Blob, path: string) {
        return await this.addToQueue(priority, async connection => (
            await connection.uploadSmall(blob, path)
        ))
    }

    async startChunkedUpload(priority: number, bypassLockIdentifier: string, path: string, size: number, startOffset: number | null) {
        return await this.addToQueue(priority, async connection => (
            await connection.startChunkedUpload(path, size, startOffset)
        ), bypassLockIdentifier)
    }

    async uploadChunk(priority: number, bypassLockIdentifier: string, uploadId: string, chunk: Blob, start: number, end: number) {
        return await this.addToQueue(priority, async connection => (
            await connection.uploadChunk(uploadId, chunk, start, end)
        ), bypassLockIdentifier)
    }

    async mkdir(priority: number, path: string) {
        return await this.addToQueue(priority, async connection => (
            await connection.mkdir(path)
        ));
    }

    async rename(priority: number, from: string, to: string) {
        return await this.addToQueue(priority, async connection => (
            await connection.rename(from, to)
        ));
    }

    async delete(priority: number, path: string) {
        return await this.addToQueue(priority, async connection => (
            await connection.delete(path)
        ));
    }
}