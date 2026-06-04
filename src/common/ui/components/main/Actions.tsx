import React, { useState } from "react";
import { useSelection } from "../../store/selectionStore";
import OverflowToMenu, { OverflowAction } from "../elements/OverflowToMenu";
import UploadDialog from "./UploadDialog";
import { getActions } from "../../../contextmenu/actions";
import { useRenameStore } from "../../store/renameStore";
import { getSession } from "../../store/sessionStore";
import { usePath } from "../../store/pathStore";
import FolderEntry, { FolderEntryType } from "../../../folder/FolderEntry";
import { joinPath } from "../../../utils";

const Actions: React.FC = () => {
    const selectedEntries = useSelection((state) => state.selectedEntries);
    const [uploadDialog, setUploadDialog] = useState(false);
    const renamingStore = useRenameStore();

    function findFreeName(baseName: string, path: string): string {
        const entries = getSession().folderCache.get(path);
        if (!entries) {
            return baseName;
        }

        let name = baseName;
        let counter = 2;
        const nameExists = (nameToCheck: string) =>
            entries.some((entry) => entry.name === nameToCheck);
        while (nameExists(name)) {
            name = `${baseName} ${counter}`;
            counter++;
        }
        return name;
    }

    const genericActions: OverflowAction[] = [
        {
            icon: "file-earmark-plus",
            label: "New File",
            onClick: () => {
                const path = usePath.getState().path;
                const name = findFreeName("New File", path);
                const entry = new FolderEntry(
                    joinPath(path, name),
                    name,
                    0,
                    FolderEntryType.File,
                    "",
                );
                renamingStore.setNewItemCreating(entry, "file");
            },
        },
        {
            icon: "folder-plus",
            label: "New Folder",
            onClick: () => {
                const path = usePath.getState().path;
                const name = findFreeName("New Folder", path);
                const entry = new FolderEntry(
                    joinPath(path, name),
                    name,
                    0,
                    FolderEntryType.Directory,
                    "",
                );
                renamingStore.setNewItemCreating(entry, "directory");
            },
        },
        {
            icon: "upload",
            label: "Upload",
            onClick: () => setUploadDialog(true),
        },
    ];

    const specificActions = getActions(selectedEntries);

    const combinedActions = [...genericActions, ...specificActions];
    const dividerIndex =
        specificActions.length > 0 ? genericActions.length : null;

    return (
        <div>
            <OverflowToMenu
                actions={combinedActions}
                dividerIndex={dividerIndex}
            />
            {uploadDialog && (
                <UploadDialog onClose={() => setUploadDialog(false)} />
            )}
        </div>
    );
};

export default Actions;
