import { EventEmitter } from "eventemitter3";

export enum Status {
    PENDING = "PENDING",
    IN_PROGRESS = "IN_PROGRESS",
    DONE = "DONE",
    ERROR = "ERROR",
    CANCELLED = "CANCELLED"
}

export class FileTree<T> extends EventEmitter {
    path: string;
    entries: (FileTree<T> | FileTreeFile<T>)[];
    suggestedNextIndex: number = 0;
    beforeStatus: Status;
    afterStatus: Status;
    attempt: number = 1;
    error?: unknown;

    constructor(path: string) {
        super();
        this.path = path;
        this.entries = [];
        this.beforeStatus = Status.PENDING;
        this.afterStatus = Status.PENDING;
    }

    setBeforeStatus(status: Status) {
        this.beforeStatus = status;
        console.log(`Setting before status of ${this.path} to ${status}`);
        this.emit("beforeStatusChange", status);
    }

    setAfterStatus(status: Status) {
        this.afterStatus = status;
        console.log(`Setting after status of ${this.path} to ${status}`);
        this.emit("afterStatusChange", status);
    }

    incrementAttempt() {
        this.attempt++;
        this.emit("attemptChange", this.attempt);
    }

    setError(error: unknown) {
        this.error = error;
        this.emit("errorChange", error);
    }

    allDoneRecursively(): boolean {
        if (this.beforeStatus !== Status.DONE || this.afterStatus !== Status.DONE) {
            return false;
        }
        for (const entry of this.entries) {
            if (entry instanceof FileTreeFile && entry.status !== Status.DONE) {
                return false;
            } else if (entry instanceof FileTree && !entry.allDoneRecursively()) {
                return false;
            }
        }
        return true;
    }
}

export class FileTreeFile<T> extends EventEmitter {
    name: string;
    data: T;
    parent: FileTree<T>;
    status: Status = Status.PENDING;
    attempt: number = 1;
    error?: unknown;

    constructor(name: string, data: T, parent: FileTree<T>) {
        super();
        this.name = name;
        this.data = data;
        this.parent = parent;
    }

    setStatus(status: Status) {
        this.status = status;
        console.log(`Setting status of file ${this.name} to ${status}`);
        this.emit("statusChange", status);
    }

    incrementAttempt() {
        this.attempt++;
        this.emit("attemptChange", this.attempt);
    }

    setError(error: unknown) {
        this.error = error;
        this.emit("errorChange", error);
    }

    progress(value: number, max: number) {
        this.emit("progress", value, max);
    }
}