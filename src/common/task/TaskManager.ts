import { EventEmitter } from "eventemitter3";
import { addMessage } from "../ui/messages";
import Task from "./Task";

class TaskManager extends EventEmitter {
    private task: Task;
    
    /**
     * Check if a task is currently running.
     */
    hasTask(): boolean {
        return this.task != null;
    }

    /**
     * Check if a new task can be started, and if not, display a message to the user.
     * 
     * @returns Returns {@code false} if the task can't be started.
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
     */
     getTask(): Task | null {
        return this.task;
    }
}

export default new TaskManager();