import { EventEmitter } from "eventemitter3";
import { TreeTask } from "./treeTask";

export enum Status {
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    DONE = "DONE",
    /** An error that requires user action to resolve. */
    ERROR = "ERROR",
    CANCELLED = "CANCELLED"
}

export class FileTree<T = unknown> extends EventEmitter {
    path: string;
    task?: TreeTask<T>;
    entries: (FileTree<T> | FileTreeFile<T>)[];
    suggestedNextIndex: number = 0;
    beforeStatus: Status;
    afterStatus: Status;
    attempt: number = 1;
    error?: unknown;
    lastAttempt: Date | null = null;

    constructor(path: string) {
        super();
        this.path = path;
        this.entries = [];
        this.beforeStatus = Status.PENDING;
        this.afterStatus = Status.PENDING;
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

    incrementAttempt() {
        this.attempt++;
        this.lastAttempt = new Date();
        this.emit("attemptChange", this.attempt);
    }

    setAttempt(attempt: number) {
        this.attempt = attempt;
        this.lastAttempt = new Date();
        this.emit("attemptChange", attempt);
    }

    setError(error: unknown) {
        this.error = error;
        this.emit("errorChange", error);
    }
}

export class FileTreeFile<T = unknown> extends EventEmitter {
    name: string;
    data: T;
    parent: FileTree<T>;
    task?: TreeTask<T>
    status: Status = Status.PENDING;
    attempt: number = 1;
    error?: unknown;
    lastAttempt: Date | null = null;
    currentProgress: { value: number; max: number } | null = null;

    constructor(name: string, data: T, parent: FileTree<T>) {
        super();
        this.name = name;
        this.data = data;
        this.parent = parent;
    }

    setStatus(status: Status) {
        let oldStatus = this.status;
        this.status = status;
        if (status === Status.ERROR || oldStatus === Status.ERROR) {
            this.task?.updateErrorTasks();
        }
        this.emit("statusChange", status);
    }

    incrementAttempt() {
        this.attempt++;
        this.lastAttempt = new Date();
        this.emit("attemptChange", this.attempt);
    }

    setAttempt(attempt: number) {
        this.attempt = attempt;
        this.lastAttempt = new Date();
        this.emit("attemptChange", attempt);
    }

    setError(error: unknown) {
        this.error = error;
        console.log("Emmitting error", String(error));
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
        const size = Number((this.data as any)?.file?.size);
        return isNaN(size) ? null : size;
    }

    paused(): boolean {
        return this.status === Status.CANCELLED || this.task?.paused === true;
    }
}