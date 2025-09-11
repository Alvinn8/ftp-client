import React, { useEffect, useState } from 'react';
import { ProgressObject, TaskStatus, TreeTask } from '../../task/treeTask';
import { formatByteSize } from '../../utils';
import Button from '../../ui2/components/Button';

export interface TaskProps {
    treeTask: TreeTask;
    onShowDetails: () => void;
}

const TreeTaskComponent: React.FC<TaskProps> = ({ treeTask, onShowDetails }) => {
    const [progress, setProgress] = useState<ProgressObject>(treeTask.progress);
    const [status, setStatus] = useState(treeTask.status);

    useEffect(() => {
        const progressHandler = (progress: ProgressObject) => setProgress({...progress});
        const statusHandler = (status: TaskStatus) => setStatus(status);
        treeTask.on("progress", progressHandler);
        treeTask.on("statusChange", statusHandler);
        return () => {
            treeTask.off("progress", progressHandler);
            treeTask.off("statusChange", statusHandler);
        };
    }, [treeTask]);

    return (
        <div className={"tree-task"} role="alert" aria-live="assertive" aria-atomic="true">
            <div className="d-flex gap-1">
                <strong className="me-auto text-color text-normal text-truncate">{treeTask.title}</strong>
                {status === TaskStatus.ERROR && (
                    <span className="badge bg-danger d-inline-flex gap-1">
                        <i className="bi bi-exclamation-triangle" />
                        Action required
                    </span>
                )}
            </div>
            <span className="text-muted-color text-small">{progress.text}</span>
            <div className="progress my-1">
                <div
                    className={`progress-bar progress-bar-striped ${status === TaskStatus.IN_PROGRESS ? "progress-bar-animated" : ""}`}
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
                { status === TaskStatus.PAUSED ? (
                    <Button
                        onClick={() => treeTask.setPaused(false)}
                        icon="play"
                        size="small"
                    />
                ) : (
                    <Button
                        onClick={() => treeTask.setPaused(true)}
                        disabled={status !== TaskStatus.IN_PROGRESS}
                        loading={status === TaskStatus.PAUSING}
                        icon="pause"
                        size="small"
                    />
                )}
                <Button
                    onClick={onShowDetails}
                    icon="eye"
                    label="Details"
                    size="small"
                    severity={status === TaskStatus.ERROR ? "danger" : "secondary"}
                    variant={status === TaskStatus.ERROR ? "outline" : "solid"}
                />
            </div>
        </div>
    );
}

export default TreeTaskComponent;