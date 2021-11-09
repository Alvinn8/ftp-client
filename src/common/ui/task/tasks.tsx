import * as React from "react";
import Task from "../../task/Task";
import { app } from "../index";
import { addMessage } from "../messages";
import TaskComponent from "./TaskComponent";

interface TasksState {
    task: Task;
}

/**
 * Displays and handles the running task.
 * <p>
 * Only one task can run at once.
 * <p>
 * Access this using {@code app.tasks}.
 */
export default class Tasks extends React.Component<{}, TasksState> {
    state = {
        task: null
    };

    constructor(props) {
        super(props);
        app.tasks = this;
    }
    
    /**
     * Check if a task is currently running.
     * @returns Returns {@code true} if a task is running, otherwise {@code false}.
     */
    hasTask(): boolean {
        return this.state.task != null;
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
        if (this.hasTask()) throw new Error("A different task is already running!");
        console.log("Setting the task to " + task.title);

        this.setState({
            task: task
        });
    }

    /**
     * Finish the current task.
     * 
     * @param task The task to finish.
     * @throws {Error} if the specified task is not the running task.
     */
    finishTask(task: Task) {
        if (this.state.task != task) throw new Error("Tried to finish a task that isn't the current task!");
        console.log("Finishing task");
        this.setState({
            task: null
        });
    }

    /**
     * Get the current task, or null if none is running.
     *
     * @returns The current task or null.
     */
    getTask(): Task | null {
        return this.state.task;
    }

    render() {
        return (
            <div className="toast-container position-absolute bottom-0 end-0 p-3">
                {this.state.task != null && (
                    <TaskComponent task={this.state.task} />
                )}
            </div>
        );
    }
}