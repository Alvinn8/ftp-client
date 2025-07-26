import { EventEmitter } from "eventemitter3"
import FTPConnection from "../ftp/FTPConnection"
import { FileTree, FileTreeFile, Status } from "./tree"
import FTPSession from "../ftp/FTPSession"
import Priority from "../ftp/Priority"
import { unexpectedErrorHandler } from "../error"

type MaybePromise<T> = Promise<T> | T;

export interface TreeTaskHandler<T> {
    /**
     * Called when a file is being processed.
     *
     * @param file The file that is being processed.
     * @param connection The FTP connection to use for the operation.
     */
    file(file: FileTreeFile<T>, connection: FTPConnection): MaybePromise<Status | void>
    /**
     * Called before a directory is processed.
     *
     * @param directory The directory that is about to be processed.
     * @param connection The FTP connection to use for the operation.
     */
    beforeDirectory(directory: FileTree<T>, connection: FTPConnection): MaybePromise<Status | void>
    /**
     * Called after a directory is processed.
     *
     * @param directory The directory that was processed.
     * @param connection The FTP connection to use for the operation.
     */
    afterDirectory(directory: FileTree<T>, connection: FTPConnection): MaybePromise<Status | void>
    /**
     * Called when the task is completed or cancelled.
     * 
     * @param fileTree The entire file tree that was processed.
     * @param connection The FTP connection to use for the operation.
     */
    final?(fileTree: FileTree<T>, connection: FTPConnection): MaybePromise<void>
}

type SubTask<T> = {
    type: "file"
    node: FileTreeFile<T>
} | {
    type: "beforeDirectory" | "afterDirectory"
    node: FileTree<T>
};

export type CountObject = {
    completedFiles: number;
    completedDirectories: number;
    completedFileSize: number;
    totalFiles: number;
    totalDirectories: number;
    totalFileSize: number;
}

export type ProgressObject = {
    value: number;
    max: number;
    text: string;
    completedFiles: number;
    totalFiles: number;
    completedFileSize: number;
    totalFileSize: number;
}

export class TreeTask<T = unknown> extends EventEmitter {
    fileTree: FileTree<T>;
    handler: TreeTaskHandler<T>;
    title: string;
    maxAttempts: number = 5;
    status: Status = Status.PENDING;
    paused: boolean = false;
    activeTasks: (FileTree<T> | FileTreeFile<T>)[] = [];
    errorTasks: (FileTree<T> | FileTreeFile<T>)[] = [];
    count: CountObject;
    progress: ProgressObject;

    constructor(fileTree: FileTree<T>, handler: TreeTaskHandler<T>) {
        super();
        this.fileTree = fileTree;
        this.handler = handler;
        this.title = "";
        this.count = {
            completedFiles: 0,
            completedDirectories: 0,
            completedFileSize: 0,
            totalFiles: 0,
            totalDirectories: 0,
            totalFileSize: 0
        };
        this.countRecursive(fileTree, this.count);
        this.progress = {
            value: 0,
            max: 100,
            text: "",
            completedFiles: 0,
            totalFiles: this.count.totalFiles,
            completedFileSize: 0,
            totalFileSize: this.count.totalFileSize
        };
        this.updateProgress();
    }

    setStatus(status: Status) {
        this.status = status;
        this.emit("statusChange", status);
    }

    setPaused(paused: boolean) {
        this.paused = paused;
        this.emit("pausedChange", paused);
    }

    cancel() {
        this.paused = true;
        this.emit("pausedChange", true);
        this.setStatus(Status.CANCELLED);
        this.emit("cancelled");
    }

    private removeActiveTask(task: FileTree<T> | FileTreeFile<T>) {
        this.activeTasks = this.activeTasks.filter(activeTask => activeTask !== task);
        this.emit("activeTasksChange", this.activeTasks);
    }

    updateProgress() {
        this.progress.value = this.count.completedFiles + this.count.completedDirectories;
        this.progress.max = this.count.totalFiles + this.count.totalDirectories;
        this.progress.completedFiles = this.count.completedFiles;
        this.progress.totalFiles = this.count.totalFiles;
        this.progress.completedFileSize = this.count.completedFileSize;
        this.progress.totalFileSize = this.count.totalFileSize;
        if (this.count.totalFiles === 1 && this.count.totalDirectories === 0) {
            // Use the file progress as the entire task progress.
            const entry = this.fileTree.entries[0];
            if (entry instanceof FileTreeFile && entry.currentProgress) {
                this.progress.value = entry.currentProgress.value;
                this.progress.max = entry.currentProgress.max;
                this.progress.completedFileSize = entry.currentProgress.value;
                this.progress.totalFileSize = entry.currentProgress.max;
            }
        }
        this.emit("progress", this.progress);
    }

    updateErrorTasks() {
        this.errorTasks = [];
        this.findErrorTasks(this.fileTree, this.errorTasks);
        this.emit("errorTasksChange", this.errorTasks);
        if (this.errorTasks.length === 0) {
            this.updateTaskStatus();
        }
    }

    findErrorTasks(fileTree: FileTree<T>, acc: (FileTree<T> | FileTreeFile<T>)[]) {
        if (fileTree.beforeStatus === Status.ERROR || fileTree.afterStatus === Status.ERROR) {
            acc.push(fileTree);
        }
        for (const entry of fileTree.entries) {
            if (entry instanceof FileTreeFile && entry.status === Status.ERROR) {
                acc.push(entry);
            } else if (entry instanceof FileTree) {
                this.findErrorTasks(entry, acc);
            }
        }
    }

    updateTaskStatus() {
        let allDone = true;
        let anyError = false;
        this.allStatusesRecursive(this.fileTree, (status) => {
            if (status !== Status.DONE && status !== Status.CANCELLED) {
                allDone = false;
            }
            if (status === Status.ERROR) {
                anyError = true;
            }
        });
        if (anyError) {
            // Error that requires user action.
            this.setStatus(Status.ERROR);
        }
        if (!anyError && !allDone && this.status === Status.ERROR) {
            // If we were in error state, but now all errors are resolved, we can continue.
            this.setStatus(Status.IN_PROGRESS);
        }
        if (allDone) {
            this.setStatus(Status.DONE);
            this.emit("done");
        }
    }

    addNextSubTask(session: FTPSession) {
        if (this.status === Status.CANCELLED || this.paused) {
            // If the task is cancelled or paused, do not add any more sub-tasks.
            return;
        }
        const subTask = this.walkFileTree(this.fileTree);
        if (!subTask) {
            // No more sub-tasks to process.
            // Check if all sub tasks are done or cancelled.
            this.updateTaskStatus();
            return;
        }
        if (subTask.type === "file") {
            subTask.node.setStatus(Status.IN_PROGRESS);
            this.activeTasks.push(subTask.node);
            this.emit("activeTasksChange", this.activeTasks);
            session.addToPoolQueue(Priority.LARGE_TASK, async (connection) => {
                try {
                    const status = await this.handler.file(subTask.node, connection);
                    subTask.node.setStatus(status || Status.DONE);
                    this.removeActiveTask(subTask.node);
                    if (subTask.node.status === Status.DONE) {
                        this.count.completedFiles++;
                        this.count.completedFileSize += subTask.node.fileSize() || 0;
                    }
                    this.updateProgress();
                } catch (error) {
                    // Close the connection because maybe it was to blame.
                    // A new connection will be used for the next task.
                    connection.close();
                    console.error("Error processing file " + subTask.node.name + ": ", error);
                    subTask.node.setError(error);
                    subTask.node.incrementAttempt();
                    subTask.node.setStatus(subTask.node.attempt > this.maxAttempts ? Status.ERROR : Status.PENDING);
                    this.removeActiveTask(subTask.node);
                }
            }).catch(unexpectedErrorHandler("TreeTask.addNextSubTask.file")); // Should never happen.
        } else if (subTask.type === "beforeDirectory") {
            subTask.node.setBeforeStatus(Status.IN_PROGRESS);
            this.emit("subTaskStart", subTask.node);
            session.addToPoolQueue(Priority.LARGE_TASK, async (connection) => {
                try {
                    const status = await this.handler.beforeDirectory(subTask.node, connection);
                    subTask.node.setBeforeStatus(status || Status.DONE);
                    this.removeActiveTask(subTask.node);
                } catch (error) {
                    // Close the connection because maybe it was to blame.
                    // A new connection will be used for the next task.
                    connection.close();
                    console.error("Error processing before directory " + subTask.node.path + ": ", error);
                    subTask.node.setError(error);
                    subTask.node.incrementAttempt();
                    subTask.node.setBeforeStatus(subTask.node.attempt > this.maxAttempts ? Status.ERROR : Status.PENDING);
                    this.removeActiveTask(subTask.node);
                }
            }).catch(unexpectedErrorHandler("TreeTask.addNextSubTask.beforeDirectory"));
        } else if (subTask.type === "afterDirectory") {
            subTask.node.setAfterStatus(Status.IN_PROGRESS);
            this.emit("subTaskStart", subTask.node);
            session.addToPoolQueue(Priority.LARGE_TASK, async (connection) => {
                try {
                    const status = await this.handler.afterDirectory(subTask.node, connection);
                    // The handler may have marked files or sub directories as not done (try again).
                    // Check if all are done, and if so, mark the directory as done.
                    // Otherwise back to pending.
                    let allDone = true;
                    for (const entry of subTask.node.entries) {
                        if (entry instanceof FileTreeFile && entry.status !== Status.DONE && entry.status !== Status.CANCELLED) {
                            allDone = false;
                        } else if (entry instanceof FileTree && 
                            (entry.beforeStatus !== Status.DONE && entry.beforeStatus !== Status.CANCELLED ||
                             entry.afterStatus !== Status.DONE && entry.afterStatus !== Status.CANCELLED)) {
                            allDone = false;
                        }
                    }
                    subTask.node.setAfterStatus(status || (allDone ? Status.DONE : Status.PENDING));
                    this.removeActiveTask(subTask.node);
                    if (allDone) {
                        this.count.completedDirectories++;
                        this.updateProgress();
                    }
                } catch (error) {
                    // Close the connection because maybe it was to blame.
                    // A new connection will be used for the next task.
                    connection.close();
                    console.error("Error processing after directory " + subTask.node.path + ": ", error);
                    subTask.node.setError(error);
                    subTask.node.incrementAttempt();
                    subTask.node.setAfterStatus(subTask.node.attempt > this.maxAttempts ? Status.ERROR : Status.PENDING);
                    this.removeActiveTask(subTask.node);
                }
            }).catch(unexpectedErrorHandler("TreeTask.addNextSubTask.afterDirectory"));
        }
    }

    private walkFileTree(fileTree: FileTree<T>): SubTask<T> | null {
        if (fileTree.attempt > this.maxAttempts) {
            return null;
        }
        // // If previous attempt was within 5 seconds, skip this task for now.
        // if (fileTree.attempt > 1 && fileTree.lastAttempt && Date.now() - fileTree.lastAttempt.getTime() < 5000) {
        //     return null;
        // }
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
        // Start at the suggested index as an optimization to avoid reprocessing already checked entries.
        // However, we must always loop trough all entries to ensure we do not miss any.
        const startIndex = fileTree.suggestedNextIndex ?? 0;
        for (let i = 0; i < fileTree.entries.length; i++) {
            const index = (startIndex + i) % fileTree.entries.length;
            const entry = fileTree.entries[index];
            // // If previous attempt was within 5 seconds, skip this task for now.
            // if (fileTree.attempt > 1 && fileTree.lastAttempt && Date.now() - fileTree.lastAttempt.getTime() < 5000) {
            //     return null;
            // }
            if (entry instanceof FileTree) {
                const subTask = this.walkFileTree(entry);
                if (subTask) {
                    fileTree.suggestedNextIndex = index + 1;
                    return subTask;
                }
                if (
                    (entry.beforeStatus !== Status.DONE && entry.beforeStatus !== Status.CANCELLED) ||
                    (entry.afterStatus !== Status.DONE && entry.afterStatus !== Status.CANCELLED)
                ) {
                    allDone = false;
                }
            } else if (entry instanceof FileTreeFile) {
                if (entry.status === Status.PENDING && entry.attempt <= this.maxAttempts) {
                    fileTree.suggestedNextIndex = index + 1;
                    return {
                        type: "file",
                        node: entry
                    }
                }
                if (entry.status !== Status.DONE && entry.status !== Status.CANCELLED) {
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

    private countRecursive(fileTree: FileTree<T>, count: CountObject) {
        for (const entry of fileTree.entries) {
            if (entry instanceof FileTreeFile) {
                count.totalFiles++;
                const fileSize = entry.fileSize() || 0;
                count.totalFileSize += fileSize;
                if (entry.status === Status.DONE) {
                    count.completedFiles++;
                    count.completedFileSize += fileSize;
                }
                // While we are at it, we can also set the task reference.
                entry.task = this;
            } else if (entry instanceof FileTree) {
                count.totalDirectories++;
                entry.task = this;
                this.countRecursive(entry, count);
            }
        }
    }

    private allStatusesRecursive(fileTree: FileTree<T>, callback: (status: Status) => void) {
        callback(fileTree.beforeStatus);
        callback(fileTree.afterStatus);
        for (const entry of fileTree.entries) {
            if (entry instanceof FileTreeFile) {
                callback(entry.status);
            } else if (entry instanceof FileTree) {
                this.allStatusesRecursive(entry, callback);
            }
        }
    }
}
