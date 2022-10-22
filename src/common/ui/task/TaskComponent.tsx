import * as React from "react";
import Task from "../../task/Task";
import { isDarkTheme } from "../theme";

export interface TaskProps {
    task: Task;
}

export interface TaskState {
    value: number;
    max: number;
    bodyOverride?: string;
}

export default class TaskComponent extends React.Component<TaskProps, TaskState> {
    state = {
        value: 0,
        max: 1,
        bodyOverride: null
    };

    constructor(props) {
        super(props);
        this.handleProgress = this.handleProgress.bind(this);
    }

    componentDidMount() {
        this.props.task.on("progress", this.handleProgress);
    }

    componentWillUnmount() {
        this.props.task.off("progress", this.handleProgress);
    }

    handleProgress(value: number, max: number, body?: string) {
        this.setState({
            value,
            max,
            bodyOverride: body
        });
    }

    render() {
        const classes = ["toast", "show"];
        const headerClasses = ["toast-header"];
        let squareColor = "bg-primary";
        if (isDarkTheme()) {
            classes.push("bg-secondary", "text-white");
            headerClasses.push("bg-secondary", "text-white");
            squareColor = "bg-dark";
        }
        return <div className={classes.join(" ")} role="alert" aria-live="assertive" aria-atomic="true">
            <div className={headerClasses.join(" ")}>
                <div className={squareColor + " rounded me-2 toast-square"}></div>
                <strong className="me-auto">{this.props.task.title}</strong>
            </div>
            <div className="toast-body">
                <span>{this.state.bodyOverride ? this.state.bodyOverride : this.props.task.body}</span>
                {this.props.task.hasProgressBar && (
                    <div className="progress">
                        <div className="progress-bar progress-bar-striped progress-bar-animated" role="progressbar"
                            aria-valuenow={this.state.value} aria-valuemin={0} aria-valuemax={this.state.max}
                            style={{ width: (this.state.value / this.state.max) * 100 + "%" }}></div>
                    </div>
                )}
            </div>
        </div>;
    }
}