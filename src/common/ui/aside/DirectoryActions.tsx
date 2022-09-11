import * as React from "react";
import Dialog from "../../Dialog";
import Priority from "../../ftp/Priority";
import { directoryUpload, fileUpload, setZipUploadMode } from "../../upload/upload";
import { joinPath } from "../../utils";
import { getApp } from "../App";

interface DirectoryActionsProps {
    workdir: string;
}

/**
 * Actions for the current directory (create folder, upload). Shown on the Aside
 * when nothing is selected.
 */
const DirectoryActions: React.FC<DirectoryActionsProps> = (props) => {
    function mkdir() {
        Dialog.prompt("New Folder", "Enter the name of the new folder", "OK", "", async name => {
            await getApp().state.session.mkdir(Priority.QUICK, joinPath(props.workdir, name));
            getApp().refresh();
        });
    }

    async function upload() {
        const choice = await Dialog.choose("Upload", "Do you want to upload files or folders?", [
            { id: "file", name: "Upload Files" },
            { id: "folder", name: "Upload Folders" },
            { id: "zip", name: "Extract and upload zip file" }
        ]);
        // Clean up from potentialy previous zip uploads
        setZipUploadMode(false);
        if (choice == "file") {
            fileUpload.click();
        } else if (choice == "folder") {
            directoryUpload.click();
        } else if (choice == "zip") {
            setZipUploadMode(true);
            fileUpload.click();
        }
    }

    async function refresh() {
        getApp().state.session.clearCache();
        getApp().refresh();
    }

    return (
        <div>
            <button className="btn btn-primary m-2" onClick={mkdir}>New Folder</button>
            <button className="btn btn-info m-2" onClick={upload}>Upload</button>
            <p>You can also upload files and folders by dragging and dropping them.</p>
            <button className="btn btn-secondary m-2" onClick={refresh}>
                <i className="bi bi-arrow-clockwise"></i>
                <span>&nbsp;Refresh</span>
            </button>
        </div>
    );
};
export default DirectoryActions;