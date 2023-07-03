import * as React from "react";
import Task from "../../task/Task";
import TaskManager from "../../task/TaskManager";
import TaskComponent from "./TaskComponent";

interface TasksState {
    task: Task;
}

/**
 * Displays the running task.
 * <p>
 * Only one task can run at once.
 */
export default class Tasks extends React.Component<{}, TasksState> {
    state = {
        task: null
    };

    constructor(props) {
        super(props);
        this.handleTaskChange = this.handleTaskChange.bind(this);
    }

    componentDidMount() {
        TaskManager.on("change", this.handleTaskChange);
    }

    componentWillUnmount() {
        TaskManager.off("change", this.handleTaskChange);
    }

    handleTaskChange(task: Task) {
        this.setState({ task });
    }

    render() {
        return (
            <div>
                {this.state.task != null && (
                    <TaskComponent task={this.state.task} />
                )}
            </div>
        );
    }
}