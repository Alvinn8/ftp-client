import { Modal } from "bootstrap";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FolderEntry, { FolderEntryType } from "@common/folder/FolderEntry";
import Button from "@common/ui/components/elements/Button";
import { useFolderContent } from "@common/ftp/FolderCache";
import { useSession } from "@common/ui/store/sessionStore";
import { useMoveStore } from "@common/ui/store/moveStore";
import { canMoveInto, moveFolderEntries } from "@common/contextmenu/actions";
import { parentdir } from "@common/util/utils";
import { unexpectedErrorHandler } from "@common/util/error";

const ROOT = new FolderEntry("/", "/", 0, FolderEntryType.Directory, "");

interface PickerNodeProps {
    entry: FolderEntry;
    movingEntries: FolderEntry[];
    selectedDest: string | null;
    setSelectedDest: (path: string) => void;
}

const PickerNode: React.FC<PickerNodeProps> = ({
    entry,
    movingEntries,
    selectedDest,
    setSelectedDest,
}) => {
    const [open, setOpen] = useState(entry.path === "/");
    const session = useSession((state) => state.getSession());
    const entries = useFolderContent(session, entry.path, open);
    const selectable = canMoveInto(movingEntries, entry.path);
    const selected = selectedDest === entry.path;
    // The folder the entries currently live in can't be a destination, but it
    // should still look normal (and expandable) rather than greyed out — only
    // structurally invalid targets (a moving folder itself, or a descendant of
    // one) are greyed.
    const isSource = entry.path === parentdir(movingEntries[0].path);
    const disabled = !selectable && !isSource;

    return (
        <div className="ps-2">
            <div className="d-flex align-items-center">
                <Button
                    icon={open ? "chevron-down" : "chevron-right"}
                    variant="ghost"
                    size="small"
                    onClick={() => setOpen(!open)}
                />
                <Button
                    icon="folder-fill text-primary"
                    label={<span className="text-truncate">{entry.name}</span>}
                    variant="ghost"
                    severity={selected ? "primary" : "secondary"}
                    disabled={disabled}
                    onClick={() => selectable && setSelectedDest(entry.path)}
                />
            </div>
            {open && (
                <div className="d-flex flex-column mt-1 ps-3">
                    {entries == null && (
                        <span
                            className="skeleton ms-2"
                            style={{ width: "60px", height: "17px" }}
                        ></span>
                    )}
                    {entries != null &&
                        entries
                            .filter((e) => e.isDirectory())
                            .map((subDirectory) => (
                                <PickerNode
                                    key={subDirectory.name}
                                    entry={subDirectory}
                                    movingEntries={movingEntries}
                                    selectedDest={selectedDest}
                                    setSelectedDest={setSelectedDest}
                                />
                            ))}
                </div>
            )}
        </div>
    );
};

const MoveDialog: React.FC = () => {
    const modalRef = useRef<HTMLDivElement>(null);
    const movingEntries = useMoveStore((state) => state.movingEntries);
    const clearMoving = useMoveStore((state) => state.clearMoving);
    const [selectedDest, setSelectedDest] = useState<string | null>(null);

    useEffect(() => {
        if (!movingEntries) {
            return;
        }
        setSelectedDest(null);
        const modalElement = modalRef.current;
        if (modalElement) {
            const modal = new Modal(modalElement, {
                backdrop: true,
                keyboard: true,
            });
            modal.show();
            const handleClose = () => clearMoving();
            modalElement.addEventListener("hidden.bs.modal", handleClose);
            return () => {
                modal.hide();
                modalElement.removeEventListener(
                    "hidden.bs.modal",
                    handleClose,
                );
            };
        }
    }, [movingEntries, clearMoving]);

    if (!movingEntries) {
        return null;
    }

    const canMove =
        selectedDest !== null && canMoveInto(movingEntries, selectedDest);
    const description =
        movingEntries.length === 1
            ? `"${movingEntries[0].name}"`
            : `${movingEntries.length} items`;

    function onMove() {
        if (!movingEntries || selectedDest === null) {
            return;
        }
        moveFolderEntries(movingEntries, selectedDest).catch(
            unexpectedErrorHandler("Failed to move"),
        );
        clearMoving();
    }

    return createPortal(
        <div className="modal" tabIndex={-1} ref={modalRef}>
            <div className="modal-dialog">
                <div className="modal-content bg-base-ui2 text-color">
                    <div className="modal-header">
                        <h5 className="modal-title me-auto">
                            <i className="bi bi-folder-symlink" />
                            <span>&nbsp;Move {description}</span>
                        </h5>
                        <button
                            type="button"
                            className="btn-close ms-1"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        ></button>
                    </div>
                    <div className="modal-body">
                        <small className="text-muted-color">
                            Choose a destination folder
                        </small>
                        <div
                            className="border rounded mt-2 p-2 overflow-auto"
                            style={{ maxHeight: "50vh" }}
                        >
                            <PickerNode
                                entry={ROOT}
                                movingEntries={movingEntries}
                                selectedDest={selectedDest}
                                setSelectedDest={setSelectedDest}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <div className="d-flex flex-wrap gap-1 w-100">
                            <Button
                                onClick={clearMoving}
                                label="Cancel"
                                severity="secondary"
                            />
                            <Button
                                onClick={onMove}
                                className="ms-auto"
                                label="Move"
                                severity="primary"
                                disabled={!canMove}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default MoveDialog;
