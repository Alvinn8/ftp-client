import { EventEmitter } from "eventemitter3";
import WebsocketFTPConnection from "../../web/WebsocketFTPConnection";
import FTPConnection from "./FTPConnection";
import FTPProfile from "./FTPProfile";

export type ConnectionPoolEntry = {
    connection: WebsocketFTPConnection;
    locked: boolean;
};

export class ConnectionPool extends EventEmitter{
    private readonly profile: FTPProfile;
    private connections: ConnectionPoolEntry[] = [];
    private targetConnectionCount: number = 1;
    private isCreatingConnection: boolean = false;
    private lastConnectionCreationAttempt: number = 0;

    constructor(profile: FTPProfile) {
        super();
        this.profile = profile;
    }

    hasAvailableConnection(): boolean {
        return this.connections.some(entry => !entry.locked && entry.connection.websocket.readyState === WebSocket.OPEN);
    }

    /**
     * Get a connection from the pool, and lock it for use.
     * 
     * @returns An un-locked FTPConnection or null if no available connections.
     */
    getConnectionAndLock(): FTPConnection | null {
        let freeConnectionCount = 0;
        for (const entry of this.connections) {
            if (!entry.locked && entry.connection.websocket.readyState === WebSocket.OPEN) {
                freeConnectionCount++;
                if (this.connections.length > this.targetConnectionCount) {
                    // If we have more connections than the target, we leave
                    // some free to be closed later.
                    if (freeConnectionCount <= this.connections.length - this.targetConnectionCount) {
                        continue;
                    }
                }
                // This connection is free and can be used.
                entry.locked = true;
                return entry.connection;
            }
        }
        return null; // No available connections
    }

    /**
     * Unlock a connection back to the pool.
     * 
     * @param connection The FTPConnection to unlock.
     */
    unlockConnection(connection: FTPConnection): void {
        for (const entry of this.connections) {
            if (entry.connection === connection) {
                entry.locked = false;
                this.emit("connectionAvailable");
                return;
            }
        }
        console.warn("Attempted to release a connection that is not in the pool.");
    }

    /**
     * Remove any closed connections and create one new connection if needed.
     */
    async refreshConnections() {
        // Remove free connection when there are too many connections.
        if (this.connections.length > this.targetConnectionCount) {
            for (let i = this.connections.length - 1; i >= this.targetConnectionCount; i--) {
                const entry = this.connections[i];
                if (!entry.locked) {
                    entry.connection.close();
                    this.connections.splice(i, 1);
                    console.log("Removed connection from pool due to excess count.");
                }
            }
        }
        // Remove closed connections. Keep connections that are still connecting.
        this.connections = this.connections.filter(entry => entry.connection.websocket.readyState !== WebSocket.CLOSED);

        // Create one new connection if we have fewer than the target count.
        if (this.connections.length < this.targetConnectionCount) {
            const now = Date.now();
            const timeSinceLastAttempt = now - this.lastConnectionCreationAttempt;
            
            // Only create a connection if:
            // 1. No connection is currently being created
            // 2. Enough time has passed since the last attempt (to prevent rapid retries)
            // 3. If more than 15 seconds have passed, assume timeout and try again.
            if ((!this.isCreatingConnection && timeSinceLastAttempt >= 1000) || timeSinceLastAttempt >= 15_000) {
                this.isCreatingConnection = true;
                this.lastConnectionCreationAttempt = now;
                
                try {
                    const connection = await this.createConnection();
                    if (await connection.isConnected()) {
                        console.log("Created new connection for pool");
                        this.connections.push({ connection, locked: false });
                        this.emit("connectionAvailable");
                    } else {
                        connection.websocket.close();
                    }
                } catch (error) {
                    // Print the error but do not crash the application.
                    // The connection will be retried later.
                    console.error("Failed to create new connection for pool:", error);
                } finally {
                    this.isCreatingConnection = false;
                }
            }
        }
    }

    private async createConnection(): Promise<WebsocketFTPConnection> {
        const connection = new WebsocketFTPConnection();
        await connection.connectToWebsocket();
        const { host, port, username, password, secure } = this.profile;
        await connection.connect(host, port, username, password, secure);
        return connection;
    }

    closeAllConnections() {
        if (this.connections.length > this.targetConnectionCount) {
            for (let i = this.connections.length - 1; i >= this.targetConnectionCount; i--) {
                const entry = this.connections[i];
                entry.connection.close();
            }
        }
    }

    getTargetConnectionCount(): number {
        return this.targetConnectionCount;
    }

    setTargetConnectionCount(count: number): void {
        if (count < 1) {
            throw new Error("Target connection count must be at least 1.");
        }
        this.targetConnectionCount = count;
        this.emit("targetConnectionCountChange", count);
    }
}