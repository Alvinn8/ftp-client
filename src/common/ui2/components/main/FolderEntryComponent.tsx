import React, { useRef, useState } from "react";
import Size from "../../../ui/Size";
import FolderEntry from "../../../folder/FolderEntry";
import { getIconFor } from "../../../ui/FileFormats";
import Button from "../elements/Button";
import Checkbox from "../elements/Checkbox";
import { useSelection } from "../../store/selectionStore";
import { usePath } from "../../store/pathStore";
import "./folderEntry.css";
import { useSession } from "../../store/sessionStore";
import Dialog from "../../../Dialog";
import { useContextMenu } from "../../store/contextMenu";
import PopupMenu from "../elements/PopupMenu";
import { getActions } from "../../../contextmenu/actions";
import { createPortal } from "react-dom";

interface FolderEntryComponentProps {
    entry: FolderEntry;
    onSelect: (e: React.MouseEvent, multiSelect: boolean) => void;
}

const FolderEntryComponent: React.FC<FolderEntryComponentProps> = ({
    entry,
    onSelect,
}) => {
    const selectedEntries = useSelection((state) => state.selectedEntries);
    const setPath = usePath((state) => state.setPath);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const [contextMenuOpen, setContextMenuOpen] = useContextMenu();
    const [menuPosition, setMenuPosition] = useState<{
        x: number;
        y: number;
    } | null>(null);

    const [renaming, setRenaming] = useState(false);
    const [newName, setNewName] = useState(entry.name);

    function onDoubleClick(e: React.MouseEvent) {
        e.preventDefault();
        if (entry.isDirectory()) {
            return () => {
                setPath(entry.path);
            };
        }
    }

    function saveRename() {
        setRenaming(false);
        const path = usePath.getState().path;
        const files = useSession.getState().getSession().folderCache.get(path);
        if (files && files.some((entry) => entry.name === newName)) {
            Dialog.message(
                "Name already taken",
                "A file or folder with that name already exists.",
            );
            setNewName(entry.name);
            return;
        }
    }

    function onRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            saveRename();
        }
        if (e.key === "Escape") {
            setRenaming(false);
            setNewName(entry.name);
        }
    }

    const selected = selectedEntries.includes(entry);

    function openContextMenu(x?: number, y?: number) {
        const selection = selectedEntries;
        if (selected && selection.length === 1) {
            // This file was selected and then right clicked.
        } else if (!selected && selection.length === 0) {
            // No files were selected but this one was right clicked,
            // select it and show the context menu for this file.
            useSelection.getState().setSelection([entry]);
        } else if (selected && selection.length > 1) {
            // Selection and this entry is a part of it
        } else if (!selected && selection.length > 0) {
            // There is an existing selection and this entry is not a
            // part of it, lets unselect it and only select this entry.
            useSelection.getState().setSelection([entry]);
        }

        if (typeof x === "number" && typeof y === "number") {
            setMenuPosition({ x, y });
        } else {
            setMenuPosition(null);
        }
        setContextMenuOpen(true);
    }

    return (
        <tr
            key={entry.name}
            className={`folder-entry-component ${selected ? "selected text-white" : ""}`}
            onClick={(e) =>
                !renaming &&
                onSelect(
                    e,
                    e.target instanceof HTMLElement &&
                        e.target.tagName === "INPUT",
                )
            }
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openContextMenu(e.clientX, e.clientY);
            }}
            onDoubleClick={onDoubleClick}
        >
            <td className="entry-name ps-2 d-flex align-items-center">
                <Checkbox
                    className="me-3"
                    checked={selected}
                    severity={selected ? "white" : "primary"}
                    onChange={() => {}}
                />
                {icon(entry, renaming, newName, selected)}
                {renaming ? (
                    <div className="folder-entry-rename-wrapper ms-2">
                        <span className="folder-entry-rename-size">
                            {newName}
                        </span>
                        <input
                            className="folder-entry-rename-input"
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onBlur={() => saveRename()}
                            onKeyDown={onRenameKeyDown}
                            autoFocus
                        />
                    </div>
                ) : (
                    <span className="ms-2">{entry.name}</span>
                )}
            </td>
            <td className="text-muted-color">
                {entry.isFile() && (
                    <Size size={entry.size} fractionDigits={1} />
                )}
                {entry.isDirectory() && (
                    <Button
                        icon="calculator"
                        label="Calculate"
                        variant="ghost"
                        size="small"
                        severity={selected ? "white" : "secondary"}
                        onClick={() => {}}
                    />
                )}
            </td>
            <td className="text-muted-color last-modified">
                {formatLastModified(entry.modifiedAt)}
            </td>
            <td>
                <Button
                    buttonRef={menuButtonRef}
                    icon="three-dots-vertical"
                    variant="ghost"
                    size="small"
                    severity={selected ? "white" : "secondary"}
                    onClick={() => openContextMenu()}
                />
            </td>
            {contextMenuOpen &&
                createPortal(
                    <PopupMenu
                        open={contextMenuOpen}
                        anchorRef={menuButtonRef}
                        x={menuPosition?.x}
                        y={menuPosition?.y}
                        onClose={() => {
                            setContextMenuOpen(false);
                            setMenuPosition(null);
                        }}
                    >
                        <div className="d-flex flex-column">
                            {getActions(selectedEntries).map((action) => (
                                <Button
                                    key={action.label}
                                    icon={action.icon}
                                    variant="ghost"
                                    size="large"
                                    label={action.label}
                                    onClick={() => {
                                        action.onClick();
                                        setContextMenuOpen(false);
                                        setMenuPosition(null);
                                    }}
                                />
                            ))}
                        </div>
                    </PopupMenu>,
                    document.body,
                )}
        </tr>
    );
};

function formatLastModified(modifiedAt: string): string {
    if (/^\d+$/.test(modifiedAt)) {
        const date = new Date(Number(modifiedAt));
        if (date.getUTCDate() === new Date().getUTCDate()) {
            return date.toLocaleTimeString();
        }
        return date.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    return modifiedAt;
}

function icon(
    entry: FolderEntry,
    renaming: boolean,
    newName: string,
    selected: boolean,
) {
    if (entry.isFile()) {
        const iconName = getIconFor(renaming ? newName : entry.name);
        return <i className={"bi bi-" + iconName} />;
    } else if (entry.isDirectory()) {
        return (
            <i
                className={
                    "bi bi-folder-fill " +
                    (selected ? "text-white" : "text-primary")
                }
            />
        );
    } else {
        return <i className="bi bi-question-square" />;
    }
}

export default FolderEntryComponent;
