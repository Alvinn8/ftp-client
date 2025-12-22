import React, { useState } from "react";
import { useSelection } from "../../store/selectionStore";
import { usePath } from "../../store/pathStore";
import { openEditor } from "../../../ui/editor/editor";
import { unexpectedErrorHandler } from "../../../error";
import OverflowToMenu, { OverflowAction } from "../elements/OverflowToMenu";
import UploadDialog from "./UploadDialog";

const Actions: React.FC = () => {
    const selectedEntries = useSelection((state) => state.selectedEntries);
    const setPath = usePath((state) => state.setPath);
    const [uploadDialog, setUploadDialog] = useState(false);

    const newFile = () => {};
    const newDirectory = () => {};
    const openDirectory = () => setPath(selectedEntries[0].path);
    const openFile = () => {
        openEditor(selectedEntries[0]).catch(
            unexpectedErrorHandler("Failed to open"),
        );
    };
    const download = () => {};
    const rename = () => {};
    const remove = () => {};

    const genericActions: OverflowAction[] = [
        { icon: "file-earmark-plus", label: "New File", onClick: newFile },
        { icon: "folder-plus", label: "New Folder", onClick: newDirectory },
        {
            icon: "upload",
            label: "Upload",
            onClick: () => setUploadDialog(true),
        },
    ];

    const specificActions: OverflowAction[] = [];
    if (selectedEntries.length > 0) {
        if (selectedEntries.length === 1) {
            if (selectedEntries[0].isDirectory()) {
                specificActions.push({
                    icon: "folder2-open",
                    label: "Open",
                    onClick: openDirectory,
                });
            }
            if (selectedEntries[0].isFile()) {
                specificActions.push({
                    icon: "box-arrow-up-right",
                    label: "Open",
                    onClick: openFile,
                });
            }
            specificActions.push({
                icon: "pencil",
                label: "Rename",
                onClick: rename,
            });
        }
        specificActions.push({
            icon: "download",
            label: "Download",
            onClick: download,
        });
        specificActions.push({
            icon: "trash",
            label: "Delete",
            onClick: remove,
        });
    }

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
