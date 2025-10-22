import React, { useEffect, useState } from "react";
import { ProgressObject, TaskStatus, TreeTask } from "../../task/treeTask";
import { createPortal } from "react-dom";
import { Modal } from "bootstrap";
import { FileTree, FileTreeFile, Status } from "../../task/tree";
import Tabs from "../../ui2/components/elements/Tabs";
import { formatByteSize, joinPath } from "../../utils";
import Button from "../../ui2/components/elements/Button";
import { FileTreeComponent, FileTreeFileComponent } from "./FileTreeComponent";
import PlusMinusInput from "../../ui2/components/elements/PlusMinusInput";
import { getApp } from "../App";
import StableHeightContainer from "../../ui2/components/elements/StableHeightContainer";

interface TreeTaskDetailsProps {
    treeTask: TreeTask;
    onClose: () => void;
}

enum Tab {
    OVERVIEW = 'overview',
    FILES = 'files',
    SETTINGS = 'settings'
}

const TreeTaskDetails: React.FC<TreeTaskDetailsProps> = ({ treeTask, onClose }) => {
    const modalRef = React.useRef<HTMLDivElement>(null);
    const [tab, setTab] = useState(Tab.OVERVIEW);
    const [status, setStatus] = useState(treeTask.status);

    useEffect(() => {
        const modalElement = modalRef.current;
        if (modalElement) {
            const modal = new Modal(modalElement, {
                backdrop: true,
                keyboard: true
            });
            modal.show();
            const handleClose = () => onClose?.();
            modalElement.addEventListener("hidden.bs.modal", handleClose);
            return () => {
                modal.hide();
                modalElement.removeEventListener("hidden.bs.modal", handleClose);
            };
        }
    }, []);

    useEffect(() => {
        const statusHandler = (status: TaskStatus) => setStatus(status);
        treeTask.on("statusChange", statusHandler);
        return () => {
            treeTask.off("statusChange", statusHandler);
        };
    }, [treeTask]);

    return (
        createPortal(
            <div className="modal" tabIndex={-1} ref={modalRef}>
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title me-auto">{ treeTask.title }</h5>
                            {statusPill(status)}
                            <button type="button" className="btn-close ms-1" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <Tabs
                                tabs={[
                                    { id: Tab.OVERVIEW, label: "Overview", icon: "list-ul" },
                                    { id: Tab.FILES, label: "Files", icon: "file-earmark-text" },
                                    { id: Tab.SETTINGS, label: "Settings", icon: "gear" }
                                ]}
                                activeTab={tab}
                                onTabChange={setTab}
                            />
                            {tab === Tab.OVERVIEW && <OverviewTab treeTask={treeTask} />}
                            {tab === Tab.FILES && <FilesTab treeTask={treeTask} />}
                            {tab === Tab.SETTINGS && <SettingsTab treeTask={treeTask} />}
                        </div>
                        <div className="modal-footer">
                            <div className="d-flex flex-wrap gap-1 w-100">
                                { status === TaskStatus.PAUSED ? (
                                    <Button
                                        onClick={() => treeTask.setPaused(false)}
                                        icon="play"
                                        label="Resume"
                                        />
                                    ) : (
                                        <Button
                                        onClick={() => treeTask.setPaused(true)}
                                        disabled={status !== TaskStatus.IN_PROGRESS}
                                        loading={status === TaskStatus.PAUSING}
                                        icon="pause"
                                        label="Pause"
                                    />
                                )}
                                <Button
                                    onClick={() => treeTask.cancel()}
                                    loading={status === TaskStatus.CANCELLING}
                                    disabled={status !== TaskStatus.IN_PROGRESS && status !== TaskStatus.ERROR && status !== TaskStatus.PAUSED}
                                    icon="stop"
                                    label="Cancel"
                                    severity="danger"
                                />
                                <Button
                                    onClick={onClose}
                                    className="ms-auto"
                                    label="Close"
                                    severity="primary"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            ,
            document.body
        )
    );
}

function statusPill(status: TaskStatus) {
    switch (status) {
        case TaskStatus.PAUSING:
            return <span className="badge bg-warning text-dark">Pausing...</span>;
        case TaskStatus.PAUSED:
            return <span className="badge bg-warning text-dark">Paused</span>;
        case TaskStatus.IN_PROGRESS:
            return <span className="badge bg-primary">In Progress</span>;
        case TaskStatus.ERROR:
            return <span className="badge bg-danger">Error</span>;
        case TaskStatus.ALMOST_DONE:
            return <span className="badge bg-primary">Almost Done...</span>;
        case TaskStatus.DONE:
            return <span className="badge bg-success">Done</span>;
        case TaskStatus.CANCELLING:
            return <span className="badge bg-primary">Cancelling...</span>;
        case TaskStatus.CANCELLED:
            return <span className="badge bg-highlight">Cancelled</span>;
    }
}

const OverviewTab: React.FC<{ treeTask: TreeTask }> = ({ treeTask }) => {
    const [progress, setProgress] = useState(treeTask.progress);
    const [status, setStatus] = useState(treeTask.status);
    const [activeTasks, setActiveTasks] = useState(treeTask.activeTasks);
    const [errorTasks, setErrorTasks] = useState(treeTask.errorTasks);

    useEffect(() => {
        const progressHandler = (progress: ProgressObject) => setProgress({...progress});
        const activeTasksHandler = (tasks: (FileTree | FileTreeFile)[]) => setActiveTasks([...tasks]);
        const errorTasksHandler = (tasks: (FileTree | FileTreeFile)[]) => setErrorTasks([...tasks]);
        const statusHandler = (status: TaskStatus) => setStatus(status);
        treeTask.on("progress", progressHandler);
        treeTask.on("activeTasksChange", activeTasksHandler);
        treeTask.on("errorTasksChange", errorTasksHandler);
        treeTask.on("statusChange", statusHandler);
        return () => {
            treeTask.off("progress", progressHandler);
            treeTask.off("activeTasksChange", activeTasksHandler);
            treeTask.off("errorTasksChange", errorTasksHandler);
            treeTask.off("statusChange", statusHandler);
        };
    }, [treeTask]);

    return (
        <div>
            <div className="progress mt-3 mb-2">
                <div
                    className={`progress-bar progress-bar-striped ${status === TaskStatus.IN_PROGRESS ? "progress-bar-animated" : ""}`}
                    role="progressbar"
                    aria-valuenow={progress.value} aria-valuemin={0} aria-valuemax={progress.max}
                    style={{ width: (progress.value / progress.max) * 100 + "%" }}
                />
            </div>
            <div className="d-flex justify-content-between gap-3 mb-3 text-xs text-muted-color text-small">
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
            { errorTasks.length > 0 && (
                <>
                    <div className="text-normal text-color">
                        Errors
                    </div>
                    {status === TaskStatus.ERROR && (
                        <div className="text-small text-muted-color mt-1">
                            The following errors need to be resolved before the task can continue.
                        </div>
                    )}
                    <StableHeightContainer className="border p-2 my-2 rounded">
                        {errorTasks.map(task => (
                            task instanceof FileTreeFile ? (
                                <FileTreeFileComponent key={joinPath(task.parent.path, task.name)} fileTreeFile={task} />
                            ) : (
                                <FileTreeComponent key={task.path} fileTree={task} deep={false} />
                            )
                        ))}
                    </StableHeightContainer>
                </>
            )}
            {(activeTasks.length > 0 || status === TaskStatus.DONE) && (
                <StableHeightContainer className="border p-2 my-2 rounded">
                    {activeTasks.map(task => (
                        task instanceof FileTreeFile ? (
                            <FileTreeFileComponent key={joinPath(task.parent.path, task.name)} fileTreeFile={task} />
                        ) : (
                            <FileTreeComponent key={task.path} fileTree={task} deep={false} />
                        )
                    ))}
                    {activeTasks.length === 0 && status === TaskStatus.DONE && (
                        <div className="d-flex flex-column justify-content-center align-items-center">
                            <i className="bi bi-check2-circle fs-1" style={{ color: '#00ff67' }} />
                            <span className="text-muted-color">All files processed successfully</span>
                        </div>
                    )}
                </StableHeightContainer>
            )}
        </div>
    );
};

const FilesTab: React.FC<{ treeTask: TreeTask }> = ({ treeTask }) => {
    return (
        <div className="overflow-auto">
            <FileTreeComponent fileTree={treeTask.fileTree} deep={true} />
        </div>
    );
};

const SettingsTab: React.FC<{ treeTask: TreeTask }> = ({ treeTask }) => {
    const connectionPool = getApp().state.session.getConnectionPool();
    const [connectionCount, setConnectionCount] = useState(connectionPool.getTargetConnectionCount());

    useEffect(() => {
        const connectionCountHandler = (count: number) => setConnectionCount(count);
        connectionPool.on("targetConnectionCountChange", connectionCountHandler);
        return () => {
            connectionPool.off("targetConnectionCountChange", connectionCountHandler);
        };
    }, [connectionPool]);

    return (
        <div>
            <div className="mb-3">
                <div className="mt-2 mb-1">Parallel Connections</div>
                <PlusMinusInput
                    value={connectionCount}
                    min={1}
                    max={10}
                    onChange={count => connectionPool.setTargetConnectionCount(count)}
                />
                <span className="text-muted-color text-small d-block mt-1">Number of simultaneous file transfers (1-10)</span>
            </div>
        </div>
    );
}

export default TreeTaskDetails;
