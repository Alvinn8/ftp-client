import { EventEmitter } from "eventemitter3";
import { HandlerAction, TaskStatus, TreeTask } from "./treeTask";
import { formatError, reportError } from "../error";

export enum Status {
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    DONE = "DONE",
    /** An error that requires user action to resolve. */
    ERROR = "ERROR",
    CANCELLED = "CANCELLED"
}

const ERRORS_TO_NOT_REPORT = ["ConnectionClosedError"]; // "NotReadableError", "NotFoundError" used to be here

export class FileTree<T = unknown> extends EventEmitter {
    readonly path: string;
    task?: TreeTask<T>;
    parent?: FileTree<T>;
    private entries: (FileTree<T> | FileTreeFile<T>)[];
    suggestedNextIndex: number = 0;
    private beforeStatus: Status;
    private afterStatus: Status;
    private attempt: number = 1;
    private error?: unknown;
    lastAttempt: Date | null = null;
    skipDirectory = false;

    constructor(path: string) {
        super();
        this.path = path;
        this.entries = [];
        this.beforeStatus = Status.PENDING;
        this.afterStatus = Status.PENDING;
    }

    getBeforeStatus(): Status {
        return this.beforeStatus;
    }
    
    getAfterStatus(): Status {
        return this.afterStatus;
    }

    setBeforeStatus(status: Status) {
        let oldStatus = this.beforeStatus;
        this.beforeStatus = status;
        this.emit("beforeStatusChange", status);
        if (status === Status.ERROR || oldStatus === Status.ERROR) {
            this.task?.updateErrorTasks();
        }
    }

    setAfterStatus(status: Status) {
        let oldStatus = this.afterStatus;
        this.afterStatus = status;
        this.emit("afterStatusChange", status);
        if (status === Status.ERROR || oldStatus === Status.ERROR) {
            this.task?.updateErrorTasks();
        }
    }

    getEntries(): (FileTree<T> | FileTreeFile<T>)[] {
        return this.entries;
    }

    addEntry(entry: FileTree<T> | FileTreeFile<T>) {
        this.entries.push(entry);
        if (entry instanceof FileTree) {
            entry.parent = this;
        }
        entry.task = this.task;
        this.emit("entriesChange", this.entries);
    }

    removeEntry(entry: FileTree<T> | FileTreeFile<T>) {
        this.entries = this.entries.filter(e => e !== entry);
        this.emit("entriesChange", this.entries);
    }

    getAttempt(): number {
        return this.attempt;
    }

    setAttempt(attempt: number) {
        this.attempt = attempt;
        this.lastAttempt = new Date();
        this.emit("attemptChange", attempt);
    }

    /**
     * Retry the task.
     *
     * @param force If true, will retry even if max attempts have been reached.
     */
    retry(force: boolean = false) {
        if (force && (!this.task || this.getAttempt() >= this.task.maxAttempts)) {
            this.setAttempt(1);
        } else {
            this.setAttempt(this.attempt + 1);
        }
        const newStatus = this.attempt > this.task?.maxAttempts ? Status.ERROR : Status.PENDING;
        if (newStatus === Status.ERROR) {
            const formattedError = formatError(this.error);
            if (!ERRORS_TO_NOT_REPORT.some(text => formattedError.includes(text))) {
                this.task?.printInfoMessage();
                reportError(this.error, "Error after " + this.attempt + " attempts for file tree");
            }
        } else {
            this.setError(null);
        }
        if (this.beforeStatus === Status.DONE) {
            this.setAfterStatus(newStatus);
        } else {
            this.setBeforeStatus(newStatus);
        }
    }

    getError(): unknown {
        return this.error;
    }

    setError(error: unknown) {
        this.error = error;
        this.emit("errorChange", error);
    }

    /**
     * A handler action used when the sub task cannot continue until the user
     * has chosen to retry or skip the sub task.
     * 
     * @param message The message to display to the user.
     * @returns The action to return from the handler function.
     */
    errorWithUserAction(message: string): HandlerAction {
        this.setError(new Error(message));
        return {
            type: "error"
        };
    }
}

export class FileTreeFile<T = unknown> extends EventEmitter {
    readonly name: string;
    data: T;
    size: number | null;
    readonly parent: FileTree<T>;
    task?: TreeTask<T>
    private status: Status = Status.PENDING;
    private attempt: number = 1;
    private error?: unknown;
    lastAttempt: Date | null = null;
    currentProgress: { value: number; max: number } | null = null;

    constructor(name: string, data: T, size: number | null, parent: FileTree<T>) {
        super();
        this.name = name;
        this.data = data;
        this.size = size;
        this.parent = parent;
    }

    getStatus(): Status {
        return this.status;
    }

    setStatus(status: Status) {
        let oldStatus = this.status;
        this.status = status;
        if (status === Status.ERROR || oldStatus === Status.ERROR) {
            this.task?.updateErrorTasks();
        }
        this.emit("statusChange", status);
    }

    getAttempt(): number {
        return this.attempt;
    }

    setAttempt(attempt: number) {
        this.attempt = attempt;
        this.lastAttempt = new Date();
        this.emit("attemptChange", attempt);
    }

    retry(force: boolean = false) {
        if (force && (!this.task || this.getAttempt() >= this.task.maxAttempts)) {
            this.setAttempt(1);
        } else {
            this.setAttempt(this.attempt + 1);
        }
        if (this.attempt > this.task?.maxAttempts) {
            this.setStatus(Status.ERROR);
            const formattedError = formatError(this.error);
            if (!ERRORS_TO_NOT_REPORT.some(text => formattedError.includes(text))) {
                this.task?.printInfoMessage();
                reportError(this.error, "Error after " + this.attempt + " attempts for file tree file");
            }
        } else {
            this.setStatus(Status.PENDING);
        }
        if (this.status !== Status.ERROR) {
            this.setError(null);
        }
    }

    getError(): unknown {
        return this.error;
    }

    setError(error: unknown) {
        if (this.error !== error) {
            console.log("Emmitting changed error", String(error));
        }
        this.error = error;
        this.emit("errorChange", error);
    }

    progress(value: number, max: number) {
        this.currentProgress = { value, max };
        this.emit("progress", this.currentProgress);
        if (this.task && this.task.count.totalFiles === 1 && this.task.count.totalDirectories === 0) {
            // This is the only file in the task.
            // The task will use this file's progress as the task's progress.
            this.task.updateProgress();
        }
    }

    fileSize(): number | null {
        return this.size;
    }

    paused(): boolean {
        if (this.status === Status.CANCELLED) {
            return true;
        }
        switch (this.task?.status) {
            case TaskStatus.PAUSING:
            case TaskStatus.PAUSED:
            case TaskStatus.CANCELLING:
            case TaskStatus.CANCELLED:
                return true;
            default:
                return false;
        }
    }

    /**
     * Pause the task to resume later.
     * 
     * @returns The action to return from the handler function.
     */
    pauseToResume(): HandlerAction {
        return {
            type: "pause_to_resume"
        }
    }

    /**
     * A handler action used when the sub task cannot continue until the user
     * has chosen to retry or skip the sub task.
     * 
     * @param message The message to display to the user.
     * @returns The action to return from the handler function.
     */
    errorWithUserAction(message: string): HandlerAction {
        this.setError(new Error(message));
        return {
            type: "error"
        };
    }
}