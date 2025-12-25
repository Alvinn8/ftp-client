import "./folderContent.css";
import React, { useRef } from "react";
import { usePath } from "../../store/pathStore";
import { useSession } from "../../store/sessionStore";
import { useFolderContent } from "../../../ftp/FolderCache";
import { randomBetween, range } from "../../../utils";
import FolderEntryComponent from "./FolderEntryComponent";
import { useSelection } from "../../store/selectionStore";
import { useDragAndDrop } from "../../../ui/DropZone";
import { handleOnDrop } from "../../../upload/upload";
import { unexpectedErrorHandler } from "../../../error";
import { useRenameStore } from "../../store/renameStore";

const FolderContent: React.FC = () => {
    const session = useSession((state) => state.getSession());
    const path = usePath((state) => state.path);
    const handleSelectionClick = useSelection((state) => state.handleClick);
    const dropZone = useRef<HTMLTableSectionElement>(null);
    const dropZoneElement = useDragAndDrop(dropZone, (e) => {
        handleOnDrop(e).catch(unexpectedErrorHandler("Failed to upload"));
    });
    const renaming = useRenameStore((state) => state.renaming);

    const entries = useFolderContent(session, path);
    const folders = entries?.filter((entry) => entry.isDirectory());
    const files = entries?.filter((entry) => !entry.isDirectory());
    if (folders && files) {
        folders.sort((a, b) => a.name.localeCompare(b.name));
        files.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (entries && entries.length === 0) {
        return (
            <div className="p-3 text-center text-muted-color d-flex flex-column flex-grow-1">
                <i className="bi bi-folder fs-1" />
                <span>This folder is empty</span>
            </div>
        );
    }

    return (
        <div className="flex-grow-1 bg-base-ui2">
            <table className="folder-content-table w-100">
                <thead>
                    <tr>
                        <th className="py-2 ps-5">Name</th>
                        <th>Size</th>
                        <th className="last-modified">Last Modified</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody ref={dropZone}>
                    {!entries &&
                        range(randomBetween(2, 8)).map((key) => (
                            <tr key={key}>
                                <td className="entry-name ps-2 d-flex align-items-center">
                                    <div
                                        className="skeleton me-3"
                                        style={{
                                            width: "16px",
                                            height: "16px",
                                            margin: "6px",
                                        }}
                                    />
                                    <div
                                        className="skeleton"
                                        style={{
                                            width: "16px",
                                            height: "18px",
                                        }}
                                    />
                                    <span
                                        className="skeleton ms-2"
                                        style={{
                                            width: "150px",
                                            height: "18px",
                                        }}
                                    />
                                </td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                        ))}
                    {renaming && renaming.creating === "directory" && (
                        <FolderEntryComponent
                            key={renaming.entry.name}
                            entry={renaming.entry}
                            onSelect={() => {}}
                        />
                    )}
                    {folders &&
                        folders.map((entry) => (
                            <FolderEntryComponent
                                key={entry.name}
                                entry={entry}
                                onSelect={(e, multiSelect) =>
                                    handleSelectionClick(
                                        entry,
                                        folders,
                                        e,
                                        multiSelect,
                                    )
                                }
                            />
                        ))}
                    {renaming && renaming.creating === "file" && (
                        <FolderEntryComponent
                            key={renaming.entry.name}
                            entry={renaming.entry}
                            onSelect={() => {}}
                        />
                    )}
                    {files &&
                        files.map((entry) => (
                            <FolderEntryComponent
                                key={entry.name}
                                entry={entry}
                                onSelect={(e, multiSelect) =>
                                    handleSelectionClick(
                                        entry,
                                        files,
                                        e,
                                        multiSelect,
                                    )
                                }
                            />
                        ))}
                </tbody>
            </table>
            {dropZoneElement}
        </div>
    );
};

export default FolderContent;
