import FTPConnection from "./FTPConnection";
import { Profile } from "./profile";
import FTPRequest from "./FTPRequest";
import { ConnectionPool } from "./ConnectionPool";
import { EventEmitter } from "eventemitter3";
import { unexpectedErrorHandler } from "@common/util/error";
import { TaskManager } from "@common/task/TaskManager";
import { FolderCache } from "./FolderCache";
import { useConnectionIssue } from "@common/ui/store/connectionIssueStore";

/**
 * An FTP session that holds some information about the current session.
 * <p>
 * The FTP connection is separated from the session so that the session can
 * reconnect using a new connection if required.
 * <p>
 * The session also holds the directory cache.
 */
export default class FTPSession extends EventEmitter {
    public readonly profile: Profile;
    public folderCache = new FolderCache();
    private connectionPool: ConnectionPool;
    private poolQueue: FTPRequest<any>[] = [];
    public readonly taskManager: TaskManager;

    constructor(profile: Profile) {
        super();
        this.profile = profile;
        this.connectionPool = new ConnectionPool(profile);
        this.connectionPool.on("connectionAvailable", () => {
            // A connection is available again, so any earlier connection issue
            // is resolved. clearIssue is a no-op when no issue is showing.
            useConnectionIssue.getState().clearIssue();
            this.tryExecutePoolRequest();
        });
        this.connectionPool.on("connectionFailed", (error?: Error) => {
            // Notify the user with a full-screen overlay so they can retry once
            // the issue is resolved. If the server reported a specific error
            // (e.g. invalid credentials or maintenance), carry it over so it is
            // shown to the user.
            useConnectionIssue.getState().showIssue({
                offline: navigator.onLine === false,
                error,
            });
        });
        this.taskManager = new TaskManager();
        this.taskManager.setSession(this);
    }

    getConnectionPool(): ConnectionPool {
        return this.connectionPool;
    }

    /**
     * Whether the server reported that this session is read-only. When read
     * only, the UI hides all features that attempt to modify files and opens
     * all files in read-only mode.
     */
    isReadOnly(): boolean {
        return this.connectionPool.isReadOnly();
    }

    async addToPoolQueue<T>(
        priority: number,
        executor: (connection: FTPConnection) => Promise<T> | T,
    ): Promise<T> {
        return await new Promise((resolve, reject) => {
            const request = new FTPRequest(priority, executor, resolve, reject);
            this.poolQueue.push(request);
        });
    }

    tryExecutePoolRequest() {
        // If the queue is empty, emit an event so that tasks can push requests to the queue.
        if (this.poolQueue.length <= 0) {
            this.emit("poolQueueEmpty");
        }
        // If there still are no requests in the queue, we don't need to do anything.
        if (this.poolQueue.length <= 0) {
            return;
        }

        // Remove any connections that are no longer valid.
        // Also creates a new connection if needed. Handle this async.
        this.connectionPool
            .refreshConnections()
            .catch(
                unexpectedErrorHandler(
                    "Failed to refresh connections in pool.",
                ),
            );

        // Get a connection if there is one available.
        const connection = this.connectionPool.getConnectionAndLock();
        if (!connection) {
            // No available connections, we will try again later when a connection
            // is available.
            return;
        }

        // sort decending, highest priority first
        this.poolQueue.sort((a, b) => b.priority - a.priority);
        const request = this.poolQueue.shift();

        Promise.resolve(request.executor(connection)).then(
            (t) => {
                request.resolve(t);
                this.connectionPool.unlockConnection(connection);
            },
            (err) => {
                request.reject(err);
                this.connectionPool.unlockConnection(connection);
            },
        );
    }
}
