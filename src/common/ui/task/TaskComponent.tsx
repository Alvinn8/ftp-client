import * as React from "react";
import Task from "../../task/Task";

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
        this.props.task.component = this;
    }

    render() {
        return <div className="toast show" role="alert" aria-live="assertive" aria-atomic="true">
            <div className="toast-header">
                <div className="bg-primary rounded me-2 toast-square"></div>
                <strong className="me-auto">{this.props.task.title}</strong>
            </div>
            <div className="toast-body">
                <span>{this.state.bodyOverride ? this.state.bodyOverride : this.props.task.body}</span>
                {this.props.task.hasProgressBar && (
                    <div className="progress">
                        <div className="progress-bar progress-bar-striped progress-bar-animated" role="progressbar"
                            aria-valuenow={this.state.value} aria-valuemin={0} aria-valuemax={this.state.max}
                            style={{width: (this.state.value / this.state.max) * 100 + "%"}}></div>
                    </div>
                )}
            </div>
        </div>;
    }
}