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

const FolderContent: React.FC = () => {
    const session = useSession((state) => state.getSession());
    const path = usePath((state) => state.path);
    const handleSelectionClick = useSelection((state) => state.handleClick);
    const dropZone = useRef<HTMLTableSectionElement>(null);
    const dropZoneElement = useDragAndDrop(dropZone, (e) => {
        handleOnDrop(e).catch(unexpectedErrorHandler("Failed to upload"));
    });

    const entries = useFolderContent(session, path);
    if (entries) {
        entries.sort((a, b) => {
            if (a.isDirectory() && b.isFile()) return -1;
            if (b.isDirectory() && a.isFile()) return 1;
            if (a.name < b.name) return -1;
            if (b.name > a.name) return 1;
            return 0;
        });
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
                        <th></th>
                        <th className="py-2">Name</th>
                        <th>Size</th>
                        <th className="last-modified">Last Modified</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody ref={dropZone}>
                    {!entries &&
                        range(randomBetween(2, 8)).map((key) => (
                            <tr key={key}>
                                <td className="ps-2">
                                    <div
                                        className="skeleton"
                                        style={{
                                            width: "16px",
                                            height: "16px",
                                            margin: "6px",
                                        }}
                                    />
                                </td>
                                <td className="entry-name">
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
                    {entries &&
                        entries.map((entry) => (
                            <FolderEntryComponent
                                key={entry.name}
                                entry={entry}
                                onSelect={(e, multiSelect) =>
                                    handleSelectionClick(
                                        entry,
                                        entries,
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
