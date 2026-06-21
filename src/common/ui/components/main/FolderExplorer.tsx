import React, { useState } from "react";
import FolderEntry, { FolderEntryType } from "@common/folder/FolderEntry";
import Button from "@common/ui/components/elements/Button";
import { useFolderContent } from "@common/ftp/FolderCache";
import { useSession } from "@common/ui/store/sessionStore";
import { usePath } from "@common/ui/store/pathStore";
import { useMoveDropTarget } from "@common/ui/useMoveDropTarget";

const ROOT = new FolderEntry("/", "/", 0, FolderEntryType.Directory, "");

const FolderExplorer: React.FC = () => {
    return <Folder entry={ROOT} />;
};

const Folder: React.FC<{ entry: FolderEntry }> = ({ entry }) => {
    const [open, setOpen] = useState(entry.path === "/");
    const setPath = usePath((state) => state.setPath);
    const session = useSession((state) => state.getSession());
    const entries = useFolderContent(session, entry.path, open);
    const { isDropTarget, dropProps } = useMoveDropTarget(entry.path);

    return (
        <div className="ps-2">
            <div
                className={
                    "d-flex align-items-center rounded" +
                    (isDropTarget ? " bg-highlight-ui2" : "")
                }
                {...dropProps}
            >
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
                    onClick={() => setPath(entry.path)}
                />
            </div>
            {open && (
                <div className="d-flex flex-column mt-1 ps-3">
                    {entries == null && (
                        <div>
                            <Button
                                icon={"chevron-right"}
                                onClick={() => {}}
                                variant="ghost"
                                size="small"
                            />
                            <i
                                className="skeleton me-1"
                                style={{ width: "14px", height: "17px" }}
                            ></i>
                            <span
                                className="skeleton"
                                style={{ width: "40px", height: "17px" }}
                            ></span>
                        </div>
                    )}
                    {entries != null &&
                        entries
                            .filter((entry) => entry.isDirectory())
                            .map((subDirectory) => (
                                <Folder
                                    key={subDirectory.name}
                                    entry={subDirectory}
                                />
                            ))}
                </div>
            )}
        </div>
    );
};

export default FolderExplorer;
