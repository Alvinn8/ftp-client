import { EventEmitter } from "eventemitter3"
import FTPConnection from "../ftp/FTPConnection"
import { FileTree, FileTreeFile, Status } from "./tree"
import FTPSession from "../ftp/FTPSession"
import { file } from "jszip"
import Priority from "../ftp/Priority"
import { unexpectedErrorHandler } from "../error"

export interface TreeTaskHandler<T> {
    file(file: FileTreeFile<T>, connection: FTPConnection): Promise<void> | void
    beforeDirectory(directory: FileTree<T>, connection: FTPConnection): Promise<void> | void
    afterDirectory(directory: FileTree<T>, connection: FTPConnection): Promise<void> | void
}

type SubTask<T> = {
    type: "file"
    node: FileTreeFile<T>
} | {
    type: "beforeDirectory" | "afterDirectory"
    node: FileTree<T>
};

export class TreeTask<T> extends EventEmitter {
    fileTree: FileTree<T>;
    handler: TreeTaskHandler<T>;
    title: string;
    maxAttempts: number = 5;
    status: Status = Status.PENDING;

    constructor(fileTree: FileTree<T>, handler: TreeTaskHandler<T>, title: string) {
        super();
        this.fileTree = fileTree;
        this.handler = handler;
        this.title = title;
    }

    setStatus(status: Status) {
        this.status = status;
        this.emit("statusChange", status);
    }

    addNextSubTask(session: FTPSession) {
        const subTask = this.walkFileTree(this.fileTree);
        if (!subTask) {
            // No more sub-tasks to process.
            // Check if all sub tasks are done.
            if (this.fileTree.allDoneRecursively()) {
                this.setStatus(Status.DONE);
                this.emit("done");
            }
            return;
        }
        if (subTask.type === "file") {
            console.log("Pushing file sub task for " + subTask.node.name + " because status is " + subTask.node.status);
            subTask.node.setStatus(Status.IN_PROGRESS);
            session.addToPoolQueue(Priority.LARGE_TASK, async (connection) => {
                try {
                    await this.handler.file(subTask.node, connection);
                    subTask.node.setStatus(Status.DONE);
                } catch (error) {
                    // Close the connection because maybe it was to blame.
                    // A new connection will be used for the next task.
                    connection.close();
                    subTask.node.setError(error);
                    subTask.node.incrementAttempt();
                    subTask.node.setStatus(Status.PENDING);
                }
            }).catch(unexpectedErrorHandler("TreeTask.addNextSubTask.file")); // Should never happen.
        } else if (subTask.type === "beforeDirectory") {
            console.log("Pushing before directory sub task for " + subTask.node.path + " because status is " + subTask.node.beforeStatus);
            subTask.node.setBeforeStatus(Status.IN_PROGRESS);
            session.addToPoolQueue(Priority.LARGE_TASK, async (connection) => {
                try {
                    await this.handler.beforeDirectory(subTask.node, connection);
                    subTask.node.setBeforeStatus(Status.DONE);
                } catch (error) {
                    // Close the connection because maybe it was to blame.
                    // A new connection will be used for the next task.
                    connection.close();
                    subTask.node.setError(error);
                    subTask.node.incrementAttempt();
                    subTask.node.setBeforeStatus(Status.PENDING);
                }
            }).catch(unexpectedErrorHandler("TreeTask.addNextSubTask.beforeDirectory"));
        } else if (subTask.type === "afterDirectory") {
            console.log("Pushing after directory sub task for " + subTask.node.path + " because status is " + subTask.node.afterStatus);
            subTask.node.setAfterStatus(Status.IN_PROGRESS);
            session.addToPoolQueue(Priority.LARGE_TASK, async (connection) => {
                try {
                    await this.handler.afterDirectory(subTask.node, connection);
                    // The handler may have marked files or sub directories as not done (try again).
                    // Check if all are done, and if so, mark the directory as done.
                    // Otherwise back to pending.
                    let allDone = true;
                    for (const entry of subTask.node.entries) {
                        if (entry instanceof FileTreeFile && entry.status !== Status.DONE) {
                            allDone = false;
                        } else if (entry instanceof FileTree && (entry.beforeStatus !== Status.DONE || entry.afterStatus !== Status.DONE)) {
                            allDone = false;
                        }
                    }
                    subTask.node.setAfterStatus(allDone ? Status.DONE : Status.PENDING);
                } catch (error) {
                    // Close the connection because maybe it was to blame.
                    // A new connection will be used for the next task.
                    connection.close();
                    subTask.node.setError(error);
                    subTask.node.incrementAttempt();
                    subTask.node.setAfterStatus(Status.PENDING);
                }
            }).catch(unexpectedErrorHandler("TreeTask.addNextSubTask.afterDirectory"));
        }
    }

    private walkFileTree(fileTree: FileTree<T>): SubTask<T> | null {
        if (fileTree.attempt > this.maxAttempts) {
            return;
        }
        if (fileTree.beforeStatus === Status.PENDING) {
            return {
                type: "beforeDirectory",
                node: fileTree
            };
        }
        // This file tree cannot be processed yet.
        if (fileTree.beforeStatus !== Status.DONE) {
            return null;
        }
        // Find nested file trees and files.
        let allDone = true;
        for (const entry of fileTree.entries) {
            if (entry.attempt > this.maxAttempts) {
                allDone = false;
                continue;
            }
            if (entry instanceof FileTree) {
                const subTask = this.walkFileTree(entry);
                if (subTask) {
                    return subTask;
                }
                if (entry.beforeStatus !== Status.DONE || entry.afterStatus !== Status.DONE) {
                    allDone = false;
                }
            } else if (entry instanceof FileTreeFile) {
                if (entry.status === Status.PENDING) {
                    return {
                        type: "file",
                        node: entry
                    }
                }
                if (entry.status !== Status.DONE) {
                    allDone = false;
                }
            }
        }
        // If all entries are done, we perform the after directory operation if it is pending.
        if (allDone && fileTree.afterStatus === Status.PENDING) {
            return {
                type: "afterDirectory",
                node: fileTree
            };
        }
    }
}
