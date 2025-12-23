import React, { useState } from "react";
import { useSelection } from "../../store/selectionStore";
import OverflowToMenu, { OverflowAction } from "../elements/OverflowToMenu";
import UploadDialog from "./UploadDialog";
import { getActions } from "../../../contextmenu/actions";

const Actions: React.FC = () => {
    const selectedEntries = useSelection((state) => state.selectedEntries);
    const [uploadDialog, setUploadDialog] = useState(false);

    const genericActions: OverflowAction[] = [
        { icon: "file-earmark-plus", label: "New File", onClick: () => {} },
        { icon: "folder-plus", label: "New Folder", onClick: () => {} },
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
