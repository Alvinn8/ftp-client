import { EventEmitter } from "eventemitter3";
import { addMessage } from "../ui/messages";
import Task from "./Task";
import { TreeTask } from "./treeTask";
import FTPSession from "../ftp/FTPSession";
import { Status } from "./tree";

export class TaskManager extends EventEmitter {
    private session: FTPSession;
    private task: Task;
    private treeTasks: TreeTask<unknown>[] = [];
    
    /**
     * Check if a task is currently running.
     * @deprecated
     */
    hasTask(): boolean {
        return this.task != null;
    }

    /**
     * Check if a new task can be started, and if not, display a message to the user.
     * 
     * @returns Returns {@code false} if the task can't be started.
     * @deprecated
     */
     requestNewTask(): boolean {
        if (this.hasTask()) {
            addMessage({
                color: "warning",
                message: "Wait for the other tasks to finish before starting a new operation.",
                stayForMillis: 5000
            });
            return false;
        }
        return true;
    }

    /**
     * Set the current running task.
     *
     * @param task The task to set.
     * @throws {Error} if a task is already running.
     * @deprecated
     */
     setTask(task: Task) {
        if (this.hasTask()) {
            console.error(this.task.title + " was running but tried to start " + task.title);
            throw new Error("A different task is already running!");
        }
        console.log("Setting the task to " + task.title);

        this.task = task;
        this.emit("change", task);
    }

    /**
     * Finish the current task.
     * 
     * @param task The task to finish.
     * @throws {Error} if the specified task is not the running task.
     * @deprecated
     */
     finishTask(task: Task) {
        if (this.task != task) {
            throw new Error("Tried to finish a task that isn't the current task!");
        }
        console.log("Finishing task");
        this.task = null;
        this.emit("change", null);
    }

    /**
     * Get the current task, or null if none is running.
     *
     * @returns The current task or null.
     * @deprecated
     */
     getTask(): Task | null {
        return this.task;
    }

    setSession(session: FTPSession) {
        this.session = session;
        this.session.on("poolQueueEmpty", () => this.tickTreeTasks());
    }

    /**
     * Add a tree task to the manager.
     *
     * @param treeTask The tree task to add.
     */
    addTreeTask(treeTask: TreeTask<unknown>) {
        this.treeTasks.push(treeTask);
        treeTask.setStatus(Status.IN_PROGRESS);
        treeTask.addNextSubTask(this.session);
        window.debugTreeTask = treeTask;
    }

    getTreeTasks(): TreeTask<unknown>[] {
        return this.treeTasks;
    }

    private tickTreeTasks() {
        for (const treeTask of this.treeTasks) {
            if (treeTask.status === Status.IN_PROGRESS) {
                treeTask.addNextSubTask(this.session);
            }
        }
    }
}

/** @deprecated */
const taskManager = new TaskManager();

window.addEventListener("beforeunload", (event) => {
    if (taskManager.hasTask() || taskManager.getTreeTasks().length > 0) {
        event.preventDefault();
        return (event.returnValue = "");
    }
});

export default taskManager;