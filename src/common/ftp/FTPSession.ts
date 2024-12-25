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
            } catch (e) {
                lastError = e;
                console.log("Failed to get connection, attempt = " + attempt + " error = ", e);
                await sleep(5000);
            }
        }
        if (success) {
            return this.connection;
        } else {
            console.log("Failed to get connection after 5 attempts, lastError =", lastError);
            throw new Error("Failed to connect to ftp-server WebSocket after 5 attempts. lastError = " + lastError);
        }
    }

    setConnection(connection: FTPConnection) {
        this.connection = connection;
    }

    disconnect() {
        if (this.connection instanceof WebsocketFTPConnection) {
            const websocketFTPConnection = this.connection as WebsocketFTPConnection;
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

    requestQueueLock(priority: number, lockIdentifier: string): Promise<void> {
        return this.addToQueue(priority, async () => this.lockQueueNow(lockIdentifier));
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

    private addToQueue<T>(priority: number, executor: (connection: FTPConnection) => Promise<T>, bypassLockIdentifier?: string): Promise<T> {
        return new Promise((resolve, reject) => {
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

    private async executeRequest() {
        // sort decending, highest priority first
        const queue = this.getEffectiveQueue();
        queue.sort((a, b) => b.priority - a.priority);
        const request = queue[0];

        let connection: FTPConnection;
        try {
            connection = await this.getConnection();
        } catch (e) {
            // If we reach this point we failed to reconnect and we will not attempt to
            // reconnect again. We therefore need to fail all requests in the queue.
            for (const request of this.queue) {
                request.reject(e);
            }
            return Promise.reject(e);
        }

        const promise = request.executor(connection);
        promise.then((t) => {
            request.resolve(t);
            this.removeFromQueue(request);
        });
        promise.catch(e => {
            request.reject(e);
            this.removeFromQueue(request);
        });
        return promise;
    }

    list(priority: number, path: string) {
        return this.addToQueue(priority, connection => (
            connection.list(path)
        ));
    }

    download(priority: number, folderEntry: FolderEntry) {
        return this.addToQueue(priority, connection => (
            connection.download(folderEntry)
        ))
    }

    uploadSmall(priority: number, blob: Blob, path: string) {
        return this.addToQueue(priority, connection => (
            connection.uploadSmall(blob, path)
        ))
    }

    startChunkedUpload(priority: number, bypassLockIdentifier: string, path: string, size: number, startOffset: number | null) {
        return this.addToQueue(priority, connection => (
            connection.startChunkedUpload(path, size, startOffset)
        ), bypassLockIdentifier)
    }

    uploadChunk(priority: number, bypassLockIdentifier: string, uploadId: string, chunk: Blob, start: number, end: number) {
        return this.addToQueue(priority, connection => (
            connection.uploadChunk(uploadId, chunk, start, end)
        ), bypassLockIdentifier)
    }

    mkdir(priority: number, path: string) {
        return this.addToQueue(priority, connection => (
            connection.mkdir(path)
        ));
    }

    rename(priority: number, from: string, to: string) {
        return this.addToQueue(priority, connection => (
            connection.rename(from, to)
        ));
    }

    delete(priority: number, path: string) {
        return this.addToQueue(priority, connection => (
            connection.delete(path)
        ));
    }
}