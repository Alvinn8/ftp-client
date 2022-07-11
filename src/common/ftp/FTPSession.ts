import FTPConnection from "./FTPConnection";
import FTPProfile from "./FTPProfile";
import FolderEntry from "../folder/FolderEntry";
import WebsocketFTPConnection from "../../web/WebsocketFTPConnection";
import { addMessage } from "../ui/messages";
import Task from "../task/Task";

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
    async getConnection(): Promise<FTPConnection>;

    /**
     * Get the ftp connection with the intention of doing stuff, so the FTPConnection
     * needs to be connected.
     * 
     * @param task The task that is requesting the connection.
     * @deprecated
     */
    async getConnection(task: Task): Promise<FTPConnection>;

    async getConnection(task?: Task): Promise<FTPConnection> {
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
}