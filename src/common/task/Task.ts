import { EventEmitter } from "eventemitter3";
import TaskManager from "./TaskManager";

/**
 * A task that is currently running.
 * <p>
 * A task can have a progress bar which will be displayed to the user.
 * 
 * @see Tasks
 */
export default class Task extends EventEmitter {
    public readonly title: string;
    public readonly body: string;
    public readonly hasProgressBar: boolean;

    constructor(title: string, body: string, hasProgressBar: boolean) {
        super();
        this.title = title;
        this.body = body;
        this.hasProgressBar = hasProgressBar;
    }

    public complete() {
        TaskManager.finishTask(this);
    }

    public progress(value: number, max: number, body?: string) {
        this.emit("progress", value, max, body);
    }
}