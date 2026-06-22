import "./folderContent.css";
import React from "react";
import { usePath } from "@common/ui/store/pathStore";
import { useSession } from "@common/ui/store/sessionStore";
import { useFolderContent } from "@common/ftp/FolderCache";
import { randomBetween, range } from "@common/util/utils";
import FolderEntryComponent from "./FolderEntryComponent";
import { useSelection } from "@common/ui/store/selectionStore";
import { useRenameStore } from "@common/ui/store/renameStore";

const FolderContent: React.FC = () => {
    const session = useSession((state) => state.getSession());
    const path = usePath((state) => state.path);
    const handleSelectionClick = useSelection((state) => state.handleClick);
    const renaming = useRenameStore((state) => state.renaming);

    const entries = useFolderContent(session, path);
    const folders = entries?.filter((entry) => entry.isDirectory());
    const files = entries?.filter((entry) => !entry.isDirectory());
    if (folders && files) {
        folders.sort((a, b) => a.name.localeCompare(b.name));
        files.sort((a, b) => a.name.localeCompare(b.name));
    }
    const allEntries = [...(folders ?? []), ...(files ?? [])];

    if (entries && entries.length === 0 && !renaming?.creating) {
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
                <thead className="position-sticky top-0 bg-base-ui2">
                    <tr>
                        <th className="py-2 ps-5">Name</th>
                        <th>Size</th>
                        <th className="last-modified">Last Modified</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
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
                                        allEntries,
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
                                        allEntries,
                                        e,
                                        multiSelect,
                                    )
                                }
                            />
                        ))}
                </tbody>
            </table>
        </div>
    );
};

export default FolderContent;
