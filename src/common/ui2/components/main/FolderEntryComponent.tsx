import React, { useState } from "react";
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

interface FolderEntryComponentProps {
    entry: FolderEntry;
}

const FolderEntryComponent: React.FC<FolderEntryComponentProps> = ({
    entry,
}) => {
    const selectedEntries = useSelection((state) => state.selectedEntries);
    const toggleSelection = useSelection((state) => state.toggle);
    const setPath = usePath((state) => state.setPath);

    const [renaming, setRenaming] = useState(false);
    const [newName, setNewName] = useState(entry.name);

    function onDoubleClick(entry: FolderEntry) {
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

    return (
        <tr
            key={entry.name}
            onClick={() => !renaming && toggleSelection(entry)}
            onDoubleClick={onDoubleClick(entry)}
        >
            <td className="ps-2">
                <Checkbox
                    checked={selectedEntries.includes(entry)}
                    onChange={() => {}}
                />
            </td>
            <td className="entry-name">
                {icon(entry, renaming, newName)}
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
                        onClick={() => {}}
                    />
                )}
            </td>
            <td className="text-muted-color last-modified">
                {formatLastModified(entry.modifiedAt)}
            </td>
            <td>
                <Button
                    icon="three-dots-vertical"
                    variant="ghost"
                    size="small"
                    onClick={() => setRenaming(true)}
                />
            </td>
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

function icon(entry: FolderEntry, renaming: boolean, newName: string) {
    if (entry.isFile()) {
        const iconName = getIconFor(renaming ? newName : entry.name);
        return <i className={"bi bi-" + iconName} />;
    } else if (entry.isDirectory()) {
        return <i className={"bi bi-folder-fill text-primary"} />;
    } else {
        return <i className="bi bi-question-square" />;
    }
}

export default FolderEntryComponent;
