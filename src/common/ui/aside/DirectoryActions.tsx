import * as React from "react";
import Dialog from "../../Dialog";
import { directoryUpload, fileUpload, setZipUploadMode } from "../../upload/upload";
import { app } from "../index";

/**
 * Actions for the current directory (create folder, upload). Shown on the Aside
 * when nothing is selected.
 */
export default class DirectoryActions extends React.Component {
    render() {
        return (
            <div>
                <button className="btn btn-primary" onClick={this.mkdir}>New Folder</button>
                <button className="btn btn-info" onClick={this.upload}>Upload</button>
                <p>You can also upload files and folders by dragging and dropping them.</p>
            </div>
        );
    }

    mkdir() {
        Dialog.prompt("New Folder", "Enter the name of the new folder", "OK", "", async name => {
            const connection = await app.state.session.getConnection();
            await connection.mkdir(name);
            await app.state.session.refresh();
        });
    }

    async upload() {
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
}