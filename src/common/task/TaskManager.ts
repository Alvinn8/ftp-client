import { EventEmitter } from "eventemitter3";
import { addMessage } from "../ui/messages";
import Task from "./Task";
import { TaskStatus, TreeTask } from "./treeTask";
import FTPSession from "../ftp/FTPSession";
import { Status } from "./tree";
import { unexpectedErrorHandler } from "../error";

export class TaskManager extends EventEmitter {
    private session: FTPSession;
    private task: Task;
    private treeTasks: TreeTask[] = [];
    private monitorIntervalId: number | null = null;
    
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
    addTreeTask(treeTask: TreeTask) {
        this.treeTasks.push(treeTask);
        treeTask.addNextSubTask(this.session);
        this.emit("change", this.task);
        this.session.tryExecutePoolRequest();
        const remove = () => {
            this.treeTasks = this.treeTasks.filter(t => t !== treeTask);
            this.emit("change", this.task);
        };
        treeTask.on("done", remove);
        treeTask.on("cancelled", remove);
        treeTask.on("statusChange", (status) => {
            if (status === Status.IN_PROGRESS) {
                this.session.tryExecutePoolRequest();
            }
        });
        this.startMonitor();
    }

    getTreeTasks(): TreeTask[] {
        return this.treeTasks;
    }

    private tickTreeTasks() {
        for (const treeTask of this.treeTasks) {
            if (treeTask.status === TaskStatus.IN_PROGRESS) {
                treeTask.addNextSubTask(this.session);
            }
        }
    }

    startMonitor() {
        if (this.monitorIntervalId !== null) {
            return; // Already monitoring
        }
        this.monitorIntervalId = window.setInterval(() => {
            this.monitor();
        }, 1000);
    }

    stopMonitor() {
        if (this.monitorIntervalId !== null) {
            clearInterval(this.monitorIntervalId);
            this.monitorIntervalId = null;
        }
    }

    monitor() {
        if (this.treeTasks.length === 0) {
            this.stopMonitor();
            // No more tasks, reset paralllel connections to 1.
            this.session.getConnectionPool().setTargetConnectionCount(1);
            this.session.getConnectionPool().closeAllConnections();
            return;
        }
        this.session.getConnectionPool().refreshConnections().catch(unexpectedErrorHandler("Error refreshing connections in TaskManager"));
        this.tickTreeTasks();
        this.session.tryExecutePoolRequest();
    }

    pauseAllTreeTasks() {
        for (const treeTask of this.treeTasks) {
            treeTask.setPaused(true);
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