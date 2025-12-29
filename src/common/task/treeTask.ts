import { EventEmitter } from "eventemitter3"
import FTPConnection from "../ftp/FTPConnection"
import { FileTree, FileTreeFile, Status } from "./tree"
import FTPSession from "../ftp/FTPSession"
import Priority from "../ftp/Priority"
import { unexpectedErrorHandler } from "../error"
import { getApp } from "../ui/App"
import { sleep } from "../utils"

type MaybePromise<T> = Promise<T> | T;

export type HandlerAction =
    | { type: "error" } // There is an error that requires user action now.
    | { type: "pause_to_resume" }; // Pause the task to resume later.

export interface TreeTaskHandler<T> {
    /**
     * Called when a file is being processed.
     *
     * @param file The file that is being processed.
     * @param connection The FTP connection to use for the operation.
     */
    file(file: FileTreeFile<T>, connection: FTPConnection): MaybePromise<HandlerAction | void>
    /**
     * Called before a directory is processed.
     *
     * @param directory The directory that is about to be processed.
     * @param connection The FTP connection to use for the operation.
     */
    beforeDirectory(directory: FileTree<T>, connection: FTPConnection): MaybePromise<HandlerAction | void>
    /**
     * Called after a directory is processed.
     *
     * @param directory The directory that was processed.
     * @param connection The FTP connection to use for the operation.
     */
    afterDirectory(directory: FileTree<T>, connection: FTPConnection): MaybePromise<HandlerAction | void>
    /**
     * Called when the task is done.
     * 
     * @param fileTree The entire file tree that was processed.
     * @param connection The FTP connection to use for the operation.
     */
    done?(fileTree: FileTree<T>, connection: FTPConnection): MaybePromise<void>
    /**
     * Called when the task is cancelled.
     * 
     * @param fileTree The entire file tree that was processed.
     * @param connection The FTP connection to use for the operation.
     */
    cancelled?(fileTree: FileTree<T>, connection: FTPConnection): MaybePromise<void>
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

type TreeTaskOptions = {
    processRootDirectory?: boolean;
    progress?: boolean;
    title: (treeTask: TreeTask) => string;
    subTitle?: (treeTask: TreeTask) => string;
}

export enum TaskStatus {
    IN_PROGRESS = "IN_PROGRESS",
    PAUSING = "PAUSING",
    PAUSED = "PAUSED",
    ERROR = "ERROR",
    ALMOST_DONE = "ALMOST_DONE", // I could not think of a better name for this
    DONE = "DONE",
    CANCELLING = "CANCELLING",
    CANCELLED = "CANCELLED"
}

export class TreeTask<T = unknown> extends EventEmitter {
    session: FTPSession;
    fileTree: FileTree<T>;
    handler: TreeTaskHandler<T>;
    title: string;
    options: TreeTaskOptions;
    maxAttempts: number = 5;
    status: TaskStatus = TaskStatus.IN_PROGRESS;
    activeTasks: (FileTree<T> | FileTreeFile<T>)[] = [];
    errorTasks: (FileTree<T> | FileTreeFile<T>)[] = [];
    count: CountObject;
    progress: ProgressObject;

    constructor(session: FTPSession, fileTree: FileTree<T>, options: TreeTaskOptions, handler: TreeTaskHandler<T>) {
        super();
        this.session = session;
        this.fileTree = fileTree;
        this.handler = handler;
        this.title = "";
        this.options = {
            processRootDirectory: true,
            progress: true,
            ...options
        };
        this.count = {
            completedFiles: 0,
            completedDirectories: 0,
            completedFileSize: 0,
            totalFiles: 0,
            totalDirectories: 0,
            totalFileSize: 0
        };
        this.countRecursive(fileTree, this.count);
        this.title = this.options.title(this);
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

    setStatus(status: TaskStatus) {
        this.status = status;
        this.emit("statusChange", status);
    }

    /**
     * Set the next task that should be shown when this task completes.
     * This is useful for counting tasks to signal which task follows them.
     * 
     * @param task The next task to show.
     */
    setNextTask(task: TreeTask) {
        this.emit("nextTask", task);
    }

    get paused(): boolean {
        return this.status === TaskStatus.PAUSED || this.status === TaskStatus.PAUSING;
    }

    setPaused(paused: boolean) {
        if (paused) {
            // Don't allow pausing if we're already in a terminal or transitional state
            if (this.status === TaskStatus.CANCELLING || this.status === TaskStatus.CANCELLED || 
                this.status === TaskStatus.DONE || this.status === TaskStatus.PAUSING || 
                this.status === TaskStatus.PAUSED) {
                return;
            }
            
            this.setStatus(TaskStatus.PAUSING);
            this.checkPausingCompletion();
        } else {
            // Resume from paused state
            if (this.status === TaskStatus.PAUSED) {
                this.setStatus(TaskStatus.IN_PROGRESS);
            }
        }
    }

    cancel() {
        // Don't allow cancelling if already cancelled or done
        if (this.status === TaskStatus.CANCELLED || this.status === TaskStatus.DONE) {
            return;
        }
        
        this.setStatus(TaskStatus.CANCELLING);
        
        // Check if we can proceed with cancellation immediately
        this.checkCancellationCompletion();
    }

    private checkCancellationCompletion() {
        if (this.status !== TaskStatus.CANCELLING) {
            return;
        }
        
        // Wait for all active tasks to finish before proceeding with cancellation
        if (this.activeTasks.length === 0) {
            this.callFinalHandler('cancelled').then(() => {
                this.setStatus(TaskStatus.CANCELLED);
                this.emit("cancelled");
            }).catch(unexpectedErrorHandler("Failed to cancel task"));
        }
        // If there are still active tasks, this method will be called again
        // when tasks complete via removeActiveTask
    }

    private checkPausingCompletion() {
        if (this.status !== TaskStatus.PAUSING) {
            return;
        }
        
        // Wait for all active tasks to finish before proceeding with pausing
        if (this.activeTasks.length === 0) {
            this.setStatus(TaskStatus.PAUSED);
        }
        // If there are still active tasks, this method will be called again
        // when tasks complete via removeActiveTask
    }

    private async callFinalHandler(handlerType: 'done' | 'cancelled') {
        const handler = this.handler[handlerType];
        if (!handler) {
            return;
        }

        let attempt = 1;
        while (attempt <= this.maxAttempts) {
            let success = false;
            await this.session.addToPoolQueue(Priority.LARGE_TASK, async (connection) => {
                try {
                    await handler(this.fileTree, connection);
                    success = true;
                } catch (error) {
                    console.error(`Error in final handler '${handlerType}' (attempt ${attempt}):`, error);
                    attempt++;
                    // Close the connection since it might be to blame
                    connection.close();
                    await sleep(1000);
                }
            });
            if (success) {
                return; // Successfully called the handler
            }
        }
        // If we reach here, all attempts failed.
        // For now, just log the error and move on.
        console.error(`Failed to call final handler '${handlerType}' after ${this.maxAttempts} attempts.`);
    }

    private removeActiveTask(task: FileTree<T> | FileTreeFile<T>) {
        this.activeTasks = this.activeTasks.filter(activeTask => activeTask !== task);
        this.emit("activeTasksChange", this.activeTasks);
        
        // Check if cancellation or pausing can now be completed
        this.checkCancellationCompletion();
        this.checkPausingCompletion();
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
            const entry = this.fileTree.getEntries()[0];
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
        if (fileTree.getBeforeStatus() === Status.ERROR || fileTree.getAfterStatus() === Status.ERROR) {
            acc.push(fileTree);
        }
        for (const entry of fileTree.getEntries()) {
            if (entry instanceof FileTreeFile && entry.getStatus() === Status.ERROR) {
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
            this.setStatus(TaskStatus.ERROR);
        }
        if (!anyError && !allDone && this.status === TaskStatus.ERROR) {
            // If we were in error state, but now all errors are resolved, we can continue.
            this.setStatus(TaskStatus.IN_PROGRESS);
        }
        if (allDone) {
            this.setStatus(TaskStatus.ALMOST_DONE);
            this.callFinalHandler('done').then(() => {
                this.setStatus(TaskStatus.DONE);
                this.emit("done");
            }).catch(unexpectedErrorHandler("Failed to complete task"));
        }
    }

    addNextSubTask(session: FTPSession) {
        if (this.status !== TaskStatus.IN_PROGRESS) {
            // Only add new sub-tasks when in progress
            return;
        }
        if (this.activeTasks.length >= session.getConnectionPool().getTargetConnectionCount()) {
            // Do not push more tasks than the connection pool can handle.
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
                    const action = await this.handler.file(subTask.node, connection);
                    if (action && action.type === "pause_to_resume") {
                        subTask.node.setStatus(Status.PENDING);
                    } else if (action && action.type === "error") {
                        subTask.node.setStatus(Status.ERROR);
                    } else {
                        subTask.node.setStatus(Status.DONE);
                    }
                    this.removeActiveTask(subTask.node);
                    if (subTask.node.getStatus() === Status.DONE) {
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
                    subTask.node.retry();
                    this.removeActiveTask(subTask.node);
                }
            }).catch(unexpectedErrorHandler("TreeTask.addNextSubTask.file")); // Should never happen.
        } else if (subTask.type === "beforeDirectory") {
            subTask.node.setBeforeStatus(Status.IN_PROGRESS);
            this.activeTasks.push(subTask.node);
            this.emit("activeTasksChange", this.activeTasks);
            session.addToPoolQueue(Priority.LARGE_TASK, async (connection) => {
                try {
                    const action = await this.handler.beforeDirectory(subTask.node, connection);
                    if (action && action.type === "pause_to_resume") {
                        subTask.node.setBeforeStatus(Status.PENDING);
                    } else if (action && action.type === "error") {
                        subTask.node.setBeforeStatus(Status.ERROR);
                    } else {
                        subTask.node.setBeforeStatus(Status.DONE);
                    }
                    this.removeActiveTask(subTask.node);
                } catch (error) {
                    // Close the connection because maybe it was to blame.
                    // A new connection will be used for the next task.
                    connection.close();
                    console.error("Error processing before directory " + subTask.node.path + ": ", error);
                    subTask.node.setError(error);
                    subTask.node.retry();
                    this.removeActiveTask(subTask.node);
                }
            }).catch(unexpectedErrorHandler("TreeTask.addNextSubTask.beforeDirectory"));
        } else if (subTask.type === "afterDirectory") {
            subTask.node.setAfterStatus(Status.IN_PROGRESS);
            this.activeTasks.push(subTask.node);
            this.emit("activeTasksChange", this.activeTasks);
            session.addToPoolQueue(Priority.LARGE_TASK, async (connection) => {
                try {
                    const action = await this.handler.afterDirectory(subTask.node, connection);
                    if (action && action.type === "pause_to_resume") {
                        subTask.node.setAfterStatus(Status.PENDING);
                    } else if (action && action.type === "error") {
                        subTask.node.setAfterStatus(Status.ERROR);
                    } else {
                        // The handler may have marked files or sub directories as not done (try again).
                        // Check if all are done, and if so, mark the directory as done.
                        // Otherwise back to pending.
                        let allDone = true;
                        for (const entry of subTask.node.getEntries()) {
                            if (entry instanceof FileTreeFile && entry.getStatus() !== Status.DONE && entry.getStatus() !== Status.CANCELLED) {
                                allDone = false;
                            } else if (entry instanceof FileTree &&
                                (entry.getBeforeStatus() !== Status.DONE && entry.getBeforeStatus() !== Status.CANCELLED ||
                                    entry.getAfterStatus() !== Status.DONE && entry.getAfterStatus() !== Status.CANCELLED)) {
                                allDone = false;
                            }
                        }
                        if (allDone) {
                            subTask.node.setAfterStatus(Status.DONE);
                            this.count.completedDirectories++;
                            this.updateProgress();
                        } else {
                            subTask.node.retry();
                        }
                    }
                    this.removeActiveTask(subTask.node);
                } catch (error) {
                    // Close the connection because maybe it was to blame.
                    // A new connection will be used for the next task.
                    connection.close();
                    console.error("Error processing after directory " + subTask.node.path + ": ", error);
                    subTask.node.setError(error);
                    subTask.node.retry();
                    this.removeActiveTask(subTask.node);
                }
            }).catch(unexpectedErrorHandler("TreeTask.addNextSubTask.afterDirectory"));
        }
    }

    private walkFileTree(fileTree: FileTree<T>): SubTask<T> | null {
        // // If previous attempt was within 5 seconds, skip this task for now.
        // if (fileTree.attempt > 1 && fileTree.lastAttempt && Date.now() - fileTree.lastAttempt.getTime() < 5000) {
        //     return null;
        // }
        
        const isRootDirectory = fileTree === this.fileTree;
        const shouldProcessDirectory = !isRootDirectory || this.options.processRootDirectory;
        
        if (shouldProcessDirectory && fileTree.getBeforeStatus() === Status.PENDING) {
            return {
                type: "beforeDirectory",
                node: fileTree
            };
        }
        // This file tree cannot be processed yet.
        if (shouldProcessDirectory && fileTree.getBeforeStatus() !== Status.DONE) {
            return null;
        }
        // If we're skipping the root directory, mark it as done so we can proceed to its children
        if (isRootDirectory && !this.options.processRootDirectory) {
            if (fileTree.getBeforeStatus() === Status.PENDING) {
                fileTree.setBeforeStatus(Status.DONE);
            }
        }
        // Find nested file trees and files.
        let allDone = true;
        // Start at the suggested index as an optimization to avoid reprocessing already checked entries.
        // However, we must always loop trough all entries to ensure we do not miss any.
        const startIndex = fileTree.suggestedNextIndex ?? 0;
        const entries = fileTree.getEntries();
        for (let i = 0; i < entries.length; i++) {
            const index = (startIndex + i) % entries.length;
            const entry = entries[index];
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
                    (entry.getBeforeStatus() !== Status.DONE && entry.getBeforeStatus() !== Status.CANCELLED) ||
                    (entry.getAfterStatus() !== Status.DONE && entry.getAfterStatus() !== Status.CANCELLED)
                ) {
                    allDone = false;
                }
            } else if (entry instanceof FileTreeFile) {
                if (entry.getStatus() === Status.PENDING) {
                    fileTree.suggestedNextIndex = index + 1;
                    return {
                        type: "file",
                        node: entry
                    }
                }
                if (entry.getStatus() !== Status.DONE && entry.getStatus() !== Status.CANCELLED) {
                    allDone = false;
                }
            }
        }
        // If all entries are done, we perform the after directory operation if it is pending.
        if (allDone && shouldProcessDirectory && fileTree.getAfterStatus() === Status.PENDING) {
            return {
                type: "afterDirectory",
                node: fileTree
            };
        }
        // If we're skipping the root directory, mark afterStatus as done when all children are done
        if (allDone && isRootDirectory && !this.options.processRootDirectory && fileTree.getAfterStatus() === Status.PENDING) {
            fileTree.setAfterStatus(Status.DONE);
        }
    }

    private countRecursive(fileTree: FileTree<T>, count: CountObject) {
        for (const entry of fileTree.getEntries()) {
            if (entry instanceof FileTreeFile) {
                count.totalFiles++;
                const fileSize = entry.fileSize() || 0;
                count.totalFileSize += fileSize;
                if (entry.getStatus() === Status.DONE) {
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
        callback(fileTree.getBeforeStatus());
        callback(fileTree.getAfterStatus());
        for (const entry of fileTree.getEntries()) {
            if (entry instanceof FileTreeFile) {
                callback(entry.getStatus());
            } else if (entry instanceof FileTree) {
                this.allStatusesRecursive(entry, callback);
            }
        }
    }
}
