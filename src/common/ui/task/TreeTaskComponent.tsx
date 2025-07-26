import React, { useEffect, useState } from 'react';
import { ProgressObject, TreeTask } from '../../task/treeTask';
import { formatByteSize } from '../../utils';
import Button from '../../ui2/components/Button';
import TreeTaskDetails from './TreeTaskDetails';
import { Status } from '../../task/tree';

export interface TaskProps {
    treeTask: TreeTask;
}

const TreeTaskComponent: React.FC<TaskProps> = ({ treeTask }) => {
    const [progress, setProgress] = useState<ProgressObject>(treeTask.progress);
    const [paused, setPaused] = useState(treeTask.paused);
    const [status, setStatus] = useState(treeTask.status);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        const progressHandler = (progress: ProgressObject) => setProgress({...progress});
        const pausedHandler = () => setPaused(treeTask.paused);
        const statusHandler = (status: Status) => setStatus(status);
        treeTask.on("progress", progressHandler);
        treeTask.on("pausedChange", pausedHandler);
        treeTask.on("statusChange", statusHandler);
        return () => {
            treeTask.off("progress", progressHandler);
            treeTask.off("pausedChange", pausedHandler);
            treeTask.off("statusChange", statusHandler);
        };
    }, [treeTask]);

    return (
        <div className={"tree-task"} role="alert" aria-live="assertive" aria-atomic="true">
            <div className="d-flex gap-1">
                <strong className="me-auto text-color text-normal text-truncate">{treeTask.title}</strong>
                {status === Status.ERROR && (
                    <span className="badge bg-danger d-inline-flex gap-1">
                        <i className="bi bi-exclamation-triangle" />
                        Action required
                    </span>
                )}
            </div>
            <span className="text-muted-color text-small">{progress.text}</span>
            <div className="progress my-1">
                <div
                    className={`progress-bar progress-bar-striped ${!paused && status === Status.IN_PROGRESS ? "progress-bar-animated" : ""}`}
                    role="progressbar"
                    aria-valuenow={progress.value} aria-valuemin={0} aria-valuemax={progress.max}
                    style={{ width: (progress.value / progress.max) * 100 + "%" }}
                />
            </div>
            <div className="d-flex justify-content-between gap-3 text-xs text-muted-color text-smaller">
                {progress.totalFiles > 1 && (
                    <span>
                        {progress.completedFiles} of {progress.totalFiles} files
                    </span>
                )}
                {progress.totalFileSize && (
                    <span>
                        {formatByteSize(progress.completedFileSize)} / {formatByteSize(progress.totalFileSize)}
                    </span>
                )}
            </div>
            <div className="d-flex flex-wrap gap-1 mt-2">
                { paused ? (
                    <Button
                        onClick={() => treeTask.setPaused(false)}
                        icon="play"
                        size="small"
                    />
                ) : (
                    <Button
                        onClick={() => treeTask.setPaused(true)}
                        icon="pause"
                        size="small"
                    />
                )}
                <Button
                    onClick={() => setShowDetails(true)}
                    icon="eye"
                    label="Details"
                    size="small"
                    severity={status === Status.ERROR ? "danger" : "secondary"}
                    variant={status === Status.ERROR ? "outline" : "solid"}
                />
            </div>
            {showDetails && (
                <TreeTaskDetails treeTask={treeTask} onClose={() => setShowDetails(false)} />
            )}
        </div>
    );
}

export default TreeTaskComponent;