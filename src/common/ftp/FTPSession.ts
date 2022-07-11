import FTPConnection from "./FTPConnection";
import FTPProfile from "./FTPProfile";
import FolderEntry from "../folder/FolderEntry";
import WebsocketFTPConnection from "../../web/WebsocketFTPConnection";
import { addMessage } from "../ui/messages";
import Task from "../task/Task";
import FTPRequest from "./FTPRequest";

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
        if (this.connection instanceof WebsocketFTPConnection) {
            const websocketFTPConnection = this.connection as WebsocketFTPConnection;
            if (websocketFTPConnection.websocket.readyState != WebSocket.OPEN) {
                // The connection is a websocket and the websocket has closed.
                console.log("Reconnecting websocket");
                addMessage({
                    color: "info",
                    message: "Reconnecting...",
                    stayForMillis: 2000
                });
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
                    addMessage({
                        color: "success",
                        message: "Reconnected!",
                        stayForMillis: 2000
                    });
                }
            }
        }
        return this.connection;
    }

    setConnection(connection: FTPConnection) {
        this.connection = connection;
    }

    private addToQueue<T>(priority: number, executor: (connection: FTPConnection) => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            const request = new FTPRequest(priority, executor, resolve, reject);
            this.queue.push(request);
            
            // If this was the only request, let's execute it
            if (this.queue.length == 1) {
                this.executeRequest();
            }
        });
    }

    private async executeRequest() {
        // sort decending, highest priority first
        this.queue.sort((a, b) => b.priority - a.priority);
        const request = this.queue[0];

        const connection = await this.getConnection();

        const promise = request.executor(connection);
        promise.then((t) => {
            const index = this.queue.indexOf(request);
            this.queue.splice(index, 1);

            request.resolve(t);

            // This request has finished, are there more in the queue?
            if (this.queue.length > 0) {
                this.executeRequest();
            }
        });
        promise.catch(e => request.reject(e));
        return promise;
    }

    list(priority: number, path: string) {
        return this.addToQueue(priority, connection => (
            connection.list(path)
        ));
    }

    download(priority: number, path: string) {
        return this.addToQueue(priority, connection => (
            connection.download(path)
        ))
    }

    upload(priority: number, blob: Blob, path: string) {
        return this.addToQueue(priority, connection => (
            connection.upload(blob, path)
        ))
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