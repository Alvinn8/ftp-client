import React, { useEffect, useState } from "react";
import { FileTree, FileTreeFile, Status } from "../../task/tree";
import { getIconFor } from "../FileFormats";
import { filename, formatByteSize } from "../../utils";
import { formatError } from "../../error";
import Button from "../../ui2/components/Button";

function statusIcon(status: string) {
    switch (status) {
        case Status.PENDING:
            return <i className="bi bi-clock" />;
        case Status.IN_PROGRESS:
            return (
                <div style={{ width: '16px' }}>
                    <div className="spinner-border text-primary spinner-border-sm" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            );
        case Status.DONE:
            return <i className="bi bi-check-circle text-success" />;
        case Status.ERROR:
            return <i className="bi bi-exclamation-circle text-danger" />;
        case Status.CANCELLED:
            return <i className="bi bi-x-circle text-secondary" />;
    }
}

type FileTreeProps = {
    fileTree: FileTree;
    deep: boolean
}

export const FileTreeComponent: React.FC<FileTreeProps> = ({ fileTree, deep }) => {
    const [beforeStatus, setBeforeStatus] = useState(fileTree.getBeforeStatus());
    const [afterStatus, setAfterStatus] = useState(fileTree.getAfterStatus());
    const [attempt, setAttempt] = useState(fileTree.getAttempt());
    const [error, setError] = useState<unknown | null>(fileTree.getError());
    const [entries, setEntries] = useState(fileTree.getEntries());
    const defaultOpen = (entries.length < 10 || fileTree.getBeforeStatus() === Status.DONE) && fileTree.getAfterStatus() !== Status.DONE;
    const [userOpened, setUserOpened] = useState<boolean | null>(null);

    const open = userOpened === null ? defaultOpen : userOpened;

    useEffect(() => {
        const beforeStatusHandler = (status: Status) => setBeforeStatus(status);
        const afterStatusHandler = (status: Status) => setAfterStatus(status);
        const attemptHandler = (attempt: number) => setAttempt(attempt);
        const errorHandler = (error: unknown) => setError(error);
        const entriesHandler = (entries: (FileTree | FileTreeFile)[]) => setEntries(entries);
        fileTree.on("beforeStatusChange", beforeStatusHandler);
        fileTree.on("afterStatusChange", afterStatusHandler);
        fileTree.on("attemptChange", attemptHandler);
        fileTree.on("errorChange", errorHandler);
        fileTree.on("entriesChange", entriesHandler);
        return () => {
            fileTree.off("beforeStatusChange", beforeStatusHandler);
            fileTree.off("afterStatusChange", afterStatusHandler);
            fileTree.off("attemptChange", attemptHandler);
            fileTree.off("errorChange", errorHandler);
            fileTree.off("entriesChange", entriesHandler);
        };
    }, [fileTree]);

    // If beforeStatus is DONE, we want to show the afterStatus. However if
    // afterStatus is PENDING, this means that sub directories are being processed.
    // For the user interface, show this as in progress.
    const status = beforeStatus === Status.DONE ?
        (afterStatus === Status.PENDING ? Status.IN_PROGRESS : afterStatus)
        : beforeStatus;

    function skipRecursively(tree: FileTree) {
        tree.setBeforeStatus(Status.CANCELLED);
        tree.setAfterStatus(Status.CANCELLED);
        for (const entry of tree.getEntries()) {
            if (entry instanceof FileTreeFile) {
                if (entry.getStatus() === Status.PENDING) {
                    entry.setStatus(Status.CANCELLED);
                }
            } else if (entry instanceof FileTree) {
                skipRecursively(entry);
            }
        }
    }
    function skip() {
        // Skip recursively. Mostly so that the correct icon is used in the UI.
        skipRecursively(fileTree);
        fileTree.setError(null);
    }

    return (
        <div className="ps-2 py-1">
            <div className="d-flex align-items-center gap-2" onClick={() => setUserOpened(!open)}>
                {deep && (
                    <Button
                        icon={open ? "chevron-down" : "chevron-right"}
                        onClick={() => {}}
                        variant="ghost"
                        size="small"
                    />
                )}
                {statusIcon(status)}
                <i className="bi bi-folder-fill text-primary" />
                <div className="flex-grow-1 d-flex align-items-center gap-1" style={{ minWidth: "100px" }}>
                    <span className="file-name text-truncate">{filename(fileTree.path)}</span>
                    { attempt > 1 && (
                        <span className="badge bg-highlight text-smaller ms-2">
                            Attempt {attempt}
                        </span>
                    )}
                </div>
            </div>
            {error && status != Status.CANCELLED && (
                <ErrorActions
                    error={error}
                    showActions={status === Status.ERROR}
                    onRetry={() => fileTree.retry(true)}
                    onSkip={() => skip()}
                    indent={deep}
                />
            )}
            {deep && open && (
                <div className="d-flex flex-column mt-1 ps-3">
                    {entries.filter((entry) => entry instanceof FileTree).map((subTree) => (
                        <FileTreeComponent key={subTree.path} fileTree={subTree} deep={true} />
                    ))}
                    {entries.filter((entry) => entry instanceof FileTreeFile).map((fileTreeFile) => (
                        <FileTreeFileComponent
                            key={fileTreeFile.name}
                            fileTreeFile={fileTreeFile}
                            indent={true}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

type FileTreeFileProps = {
    fileTreeFile: FileTreeFile;
    indent?: boolean;
}

export const FileTreeFileComponent: React.FC<FileTreeFileProps> = ({ fileTreeFile, indent }) => {
    const [status, setStatus] = useState(fileTreeFile.getStatus());
    const [attempt, setAttempt] = useState(fileTreeFile.getAttempt());
    const [error, setError] = useState<unknown | null>(fileTreeFile.getError());
    const [progress, setProgress] = useState<{ value: number, max: number } | null>(fileTreeFile.currentProgress);

    useEffect(() => {
        const statusHandler = (newStatus: Status) => setStatus(newStatus);
        const attemptHandler = (newAttempt: number) => setAttempt(newAttempt);
        const errorHandler = (error: unknown) => { setError(error); console.log("Setting error", String(error)); };
        const progressHandler = (progress: { value: number, max: number }) => setProgress({...progress});
        fileTreeFile.on("statusChange", statusHandler);
        fileTreeFile.on("errorChange", errorHandler);
        fileTreeFile.on("attemptChange", attemptHandler);
        fileTreeFile.on("progress", progressHandler);
        return () => {
            fileTreeFile.off("statusChange", statusHandler);
            fileTreeFile.off("errorChange", errorHandler);
            fileTreeFile.off("attemptChange", attemptHandler);
            fileTreeFile.off("progress", progressHandler);
        };
    }, [fileTreeFile]);

    const fileSize = fileTreeFile.fileSize();

    return (
        <div className="py-1" style={{ marginLeft: indent ? "36px" : "0px" }}>
            <div className="d-flex align-items-center gap-2">
                {statusIcon(status)}
                <i className={`bi bi-${getIconFor(fileTreeFile.name)}`} />
                <div className="flex-grow-1" style={{ minWidth: "100px" }}>
                    <div className="d-flex align-items-center gap-1">
                        <span className="file-name text-truncate">{fileTreeFile.name}</span>
                        { attempt > 1 && (
                            <span className="badge bg-highlight text-smaller ms-2">
                                Attempt {attempt}
                            </span>
                        )}
                    </div>
                    {status === Status.IN_PROGRESS && progress && (
                        <div className="progress" style={{ height: "4px", marginTop: "2px" }}>
                            <div className="progress-bar" role="progressbar"
                                aria-valuenow={progress.value} aria-valuemin={0} aria-valuemax={progress.max}
                                style={{ width: (progress.value / progress.max) * 100 + "%" }}></div>
                        </div>
                    )}
                </div>
                {fileSize !== null && (
                    <span className="text-muted-color text-small text-end" style={{ minWidth: "65px" }}>
                        {formatByteSize(fileSize, 1)}
                    </span>
                )}
            </div>
            {error && status != Status.CANCELLED && (
                <ErrorActions
                    error={error}
                    showActions={status === Status.ERROR}
                    onRetry={() => fileTreeFile.retry(true)}
                    onSkip={() => fileTreeFile.setStatus(Status.CANCELLED)}
                />
            )}
        </div>
    );
}

interface ErrorActionsProps {
    error: unknown;
    showActions: boolean;
    onRetry: () => void;
    onSkip: () => void;
    indent?: boolean;
}

function errorParts(error: unknown): [string, string] {
    const errorParts = formatError(error).split(":");
    const errorName = errorParts.shift().trim();
    const errorMessage = errorParts.join(":").trim();
    return [errorName, errorMessage];
}

function ErrorActions({ error, showActions, onRetry, onSkip, indent }: ErrorActionsProps) {
    const [errorName, errorMessage] = errorParts(error);

    return (
        <div className="my-2" style={{ marginLeft: indent ? "36px" : "0px" }}>
            <div className="d-flex gap-2">
                <i className="bi bi-exclamation-triangle text-danger" />
                <div className="flex-grow-1">
                    <span className="d-block text-danger">{ errorName }</span>
                    <span className="text-muted-color text-small">{ errorMessage }</span>
                </div>
            </div>
            { showActions && (
                <div className="d-flex gap-2 pt-1">
                    <Button
                        onClick={onRetry}
                        icon="arrow-clockwise"
                        label="Retry"
                        size="small"
                    />
                    <Button
                        onClick={onSkip}
                        icon="skip-end"
                        label="Skip"
                        size="small"
                    />
                </div>
            )}
        </div>
    );
}