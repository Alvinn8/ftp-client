import * as React from "react";
import Dialog from "../../Dialog";
import Priority from "../../ftp/Priority";
import { directoryUpload, fileUpload, setZipUploadMode } from "../../upload/upload";
import { joinPath } from "../../utils";
import { getApp } from "../App";
import FolderContentProviders from "../../folder/FolderContentProviders";
import { unexpectedErrorHandler } from "../../error";

interface DirectoryActionsProps {
    workdir: string;
}

/**
 * Actions for the current directory (create folder, upload). Shown on the Aside
 * when nothing is selected.
 */
const DirectoryActions: React.FC<DirectoryActionsProps> = (props) => {
    function mkdir() {
        Dialog.prompt("Create New Folder", "Enter the name of the new folder", "OK", "", name => {
            if (name.includes("/")) {
                Dialog.message("Invalid folder name", "The name of a folder cannot contain slashes.");
                return;
            }
            console.log("Creating folder with name " + name);
            getApp().state.session.mkdir(Priority.QUICK, joinPath(props.workdir, name))
                .then(() => getApp().refresh())
                .catch(err => {
                    if (String(err).includes("EEXIST")) {
                        Dialog.message("Folder already exists", "A folder (or file) with that name already exists.");
                        getApp().refresh(true);
                    } else {
                        unexpectedErrorHandler("Failed to Create New Folder")(err);
                    }
                });
        });
    }

    function createFile() {
        Dialog.prompt("Create New File", "Enter the name of the new file", "OK", "", name => {
            console.log("Creating new file with name " + name);
            (async () => {
                const entries = await FolderContentProviders.FTP.getFolderEntries(Priority.QUICK, props.workdir);
                if (entries.find(entry => entry.name == name)) {
                    Dialog.message("File already exists", "A file with this name already exists in this folder.");
                    return;
                }
                if (name.includes("/")) {
                    Dialog.message("Invalid file name", "The name of a file cannot contain slashes.");
                    return;
                }
                await getApp().state.session.uploadSmall(Priority.QUICK, new Blob([""]), joinPath(props.workdir, name));
                getApp().refresh();
            })().catch(unexpectedErrorHandler("Failed to Create New File"));
        });
    }

    function upload() {
        (async () => {
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
        })().catch(unexpectedErrorHandler("Failed to prepare upload"));
    }

    function refresh() {
        getApp().state.session.clearCache();
        getApp().refresh();
    }

    return (
        <div>
            <button className="btn btn-primary m-2" onClick={mkdir}>Create Folder</button>
            <button className="btn btn-primary m-2" onClick={createFile}>Create File</button>
            <br />
            <button className="btn btn-info m-2" onClick={upload}>Upload</button>
            <button className="btn btn-secondary m-2" onClick={refresh}>
                <i className="bi bi-arrow-clockwise"></i>
                <span>&nbsp;Refresh</span>
            </button>
            <p className="m-2">You can also upload files and folders by dragging and dropping them.</p>
        </div>
    );
};
export default DirectoryActions;