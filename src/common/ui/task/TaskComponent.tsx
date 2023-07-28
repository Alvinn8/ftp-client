import * as React from "react";
import Task from "../../task/Task";
import { isDarkTheme } from "../theme";
import {useEffect, useState} from "react";

export interface TaskProps {
    task: Task;
}

export interface Progress {
    value: number;
    max: number;
    bodyOverride?: string;
}

const TaskComponent: React.FC<TaskProps> = ({ task }) => {
    const [progress, setProgress] = useState<Progress | null>(null);

    useEffect(() => {
        const progressHandler = (value: number, max: number, bodyOverride?: string) => {
            setProgress({ value, max, bodyOverride });
        };
        task.on("progress", progressHandler);
        return () => {
            task.off("progress", progressHandler);
            setProgress(null);
        };
    }, [task]);

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
            <strong className="me-auto">{task.title}</strong>
        </div>
        <div className="toast-body">
            <span>{progress && progress.bodyOverride ? progress.bodyOverride : task.body}</span>
            {task.hasProgressBar && progress && (
                <div className="progress">
                    <div className="progress-bar progress-bar-striped progress-bar-animated" role="progressbar"
                        aria-valuenow={progress.value} aria-valuemin={0} aria-valuemax={progress.max}
                        style={{ width: (progress.value / progress.max) * 100 + "%" }}></div>
                </div>
                )}
        </div>
    </div>;
};

export default TaskComponent;