/*
 * File for handleing file and folder uploads in different ways.
 */

import JSZip from "jszip";
import * as React from "react";
import Dialog from "../Dialog";
import Directory from "./Directory";
import { upload } from "./uploadToServer";

export namespace UploadSupport {
    /**
     * Whether folders can be uploaded from file inputs.
     */
    export const inputFolderUpload =
    ("webkitdirectory" in HTMLInputElement.prototype
    || "mozdirectory" in HTMLInputElement.prototype
    || "directory" in HTMLInputElement.prototype)
    && ("webkitRelativePath" in File.prototype
    || "relativePath" in File.prototype);

    /**
     * Whether folders can be drag and drop'ed with the drop event.
     */
    export const dropFolderUpload =
        "DataTransfer" in window
    && "items" in DataTransfer.prototype
    && "DataTransferItemList" in window
    && "DataTransferItem" in window
    && "webkitGetAsEntry" in DataTransferItem.prototype;
}

// Drag and drop

function isZipFile(fileName: string) {
    return fileName.endsWith(".zip") || fileName.endsWith(".mcworld") || fileName.endsWith(".mcpack");
}

/**
 * Handle a drop event where the user potentially dropped files to upload and
 * upload them. Will also prompt the user to extract a zip file if they drop
 * a zip file.
 *
 * @param event The drag and drop event.
 */
export async function handleOnDrop(event: React.DragEvent<HTMLDivElement> | DragEvent) {
    event.preventDefault();
    
    // We have to get the uploads sync, otherwise they disappear.
    const uploads = await getDropEventFiles(event);

    // Check if the user uploaded a zip file
    if (Object.keys(uploads.directories).length == 0 && uploads.files.length == 1 && isZipFile(uploads.files[0].name)) {
        // The user has uploaded a zip file
        const file = uploads.files[0];
        const extractAndUpload = await Dialog.confirm("Extract and upload?", "Do you want to extract the contents of " + file.name + " and upload the contents, or do you want to upload the zip file?", "Upload zip file", "Extract and upload contents");
        if (extractAndUpload) {
            await handleZip(file);
            return;
        }
    }

    // Upload the files
    await upload(uploads);
}

/**
 * Get the uploads from a drop event.
 * 
 * @param event The drop event.
 * @returns The uploads.
 */
async function getDropEventFiles(event: React.DragEvent | DragEvent): Promise<Directory> {
    const root = new Directory();
    const promises: Promise<void>[] = [];
    // Uploads from the drag and drop event have to be used exactly when the event
    // is called, synchronously, otherwise they disappear. Even if the
    // DataTransferItemList is saved, or induvidual DataTransferItems are stored,
    // they will all clear. Even if an await keyword is used they will be gone.
    //
    // Therefore, this method iterates sync and uses the item and stores all promises.
    // These promises can then all be awaited using Promise.all

    for (const item of event.dataTransfer.items) {
        if (item.kind == "file") {
            const entry = item.webkitGetAsEntry();
            if (entry) {
                const promise = handleItem(entry, root);
                promises.push(promise);
            }
        }
    }
    await Promise.all(promises);
    return root;
}

/**
 * Handle an uploaded FileSystemEntry and extract the files to the {@link Directory}.
 * Will also handle subdirectories and add them to the directory and handle their
 * files and folders recursively.
 * 
 * @param item The item to handle.
 * @param directory The directory to extract the upload to.
 */
async function handleItem(item: FileSystemEntry, directory: Directory) {
    if (item.isFile) {
        const file = await (new Promise<File>(function(resolve, reject) {
            (item as FileSystemFileEntry).file(resolve);
        }));
        directory.files.push(file);
    } else if (item.isDirectory) {
        const reader = (item as FileSystemDirectoryEntry).createReader();
        const entries: FileSystemEntry[] = [];
        while (true) {
            const readEntries = await (new Promise<FileSystemEntry[]>(function(resolve, reject) {
                reader.readEntries(resolve, reject);
            }));
            if (readEntries.length > 0) {
                entries.push(...readEntries);
            } else {
                break;
            }
        }
        const subdir = new Directory();
        directory.directories[item.name] = subdir;
        for (const entry of entries) {
            await handleItem(entry, subdir);
        }
    }
}

// Input

type InputEvent = { target: HTMLInputElement } & Event;

let zipUploadMode = false;

/**
 * Enable or disable zip upload mode. In zip upload mode only zip files can be
 * selected using the file input and only one file can be selected, and the
 * uploaded file will be extracted before being uploaded.
 *
 * @param value Whether zip upload mode is enabled.
 */
export function setZipUploadMode(value: boolean) {
    zipUploadMode = value;
    if (zipUploadMode) {
        fileUpload.accept = ".zip";
        fileUpload.multiple = false;
    } else {
        fileUpload.accept = null;
        fileUpload.multiple = true;
    }
}

/**
 * Handle and upload the uploads from a file input. Will also unzip a zip file if
 * zip upload mode is enabled.
 *
 * @param event The input event.
 */
export async function handleInputUpload(event: InputEvent) {
    if (zipUploadMode) {
        const file = event.target.files[0];
        if (file != null) {
            await handleZip(file);
        }
        return;
    }
    const root = new Directory();
    for (const file of event.target.files) {
        // @ts-ignore
        const path: string = file.relativePath || file.webkitRelativePath;
        const parts = path.split("/");
        let directory = root;
        
        let i = 0;
        let part = parts[i];
        while (part) {
            if (!directory.directories[part]) directory.directories[part] = new Directory();
            directory = directory.directories[part];

            i++;
            if (i > parts.length - 2) break; // Last part is file name
            part = parts[i];
        }
        directory.files.push(file);
    }
    // Clean up
    event.target.value = null;
    setZipUploadMode(false);

    // Upload
    await upload(root);
}

/**
 * Input element for uploading files. Open with {@code .click()}.
 */
export const fileUpload = document.createElement("input");
/**
 * Input element for uploading directories. Open with {@code .click()}.
 */
export const directoryUpload = document.createElement("input");

(function() {
    fileUpload.type = "file";
    fileUpload.multiple = true;
    fileUpload.style.display = "none";
    fileUpload.addEventListener("change", handleInputUpload);
    document.body.appendChild(fileUpload);

    directoryUpload.type = "file";
    // @ts-ignore
    directoryUpload.webkitdirectory = true;
    // @ts-ignore
    directoryUpload.directory = true;
    directoryUpload.multiple = true;
    directoryUpload.style.display = "none";
    directoryUpload.addEventListener("change", handleInputUpload);
    document.body.appendChild(directoryUpload);
})();

// zip

/**
 * Get the uploads from a zip file.
 * 
 * @param zip The JSZip object.
 * @returns The uploads.
 */
async function getUploadsFromZip(zip): Promise<Directory> {
    const root = new Directory();
    for (let path in zip.files) {
        const zipObject = zip.files[path];
        if (path.endsWith("/")) path = path.substring(0, path.length - 1);

        let directory = root;
        let fileName;
        if (path.includes("/")) {
            // There are subdirectories, navigate to the directory the file is in.
            const parts = path.split("/");

            let i = 0;
            let part = parts[i];
            // For directories we wanna loop trough all parts and create the directories.
            // For files we don't want to loop trough the last part as that is the file name.
            const stopPoint = zipObject.dir ? parts.length - 1 : parts.length - 2;

            while (part != null) {
                if (directory.directories[part] == null) directory.directories[part] = new Directory();
                directory = directory.directories[part];

                i++;
                if (i > stopPoint) break;
                part = parts[i];
            }
            fileName = parts[parts.length - 1];
        } else {
            // No subfolers? The file name is the path.
            fileName = path;
        }
        if (!zipObject.dir) {
            // For files, create the file
            const blob: Blob = await zipObject.async("blob");
            const file = new File([blob], fileName);
            directory.files.push(file);
        }
    }
    return root;
}

/**
 * Handle a zip file, extracting the contents and uploading them.
 *
 * @param file The zip file.
 */
async function handleZip(file: File) {
    const zip = await JSZip.loadAsync(file);
    const uploads = await getUploadsFromZip(zip);
    upload(uploads);
}