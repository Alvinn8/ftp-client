/*
 * File for handleing file and folder uploads in different ways.
 */

import * as JSZip from "jszip";
import * as React from "react";
import Dialog from "../Dialog";
import FolderContentProviders from "../folder/FolderContentProviders";
import DirectoryPath from "../ftp/DirectoryPath";
import FTPConnection from "../ftp/FTPConnection";
import Priority from "../ftp/Priority";
import Task from "../task/Task";
import { app } from "../ui/index";
import { joinPath } from "../utils";
import Directory from "./Directory";

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
       "items" in DataTransfer.prototype
    && "DataTransferItemList" in window
    && "DataTransferItem" in window
    && "webkitGetAsEntry" in DataTransferItem.prototype;
}

/**
 * Upload the uploads to the current directory to the FTP server.
 *
 * @param uploads The contents to upload.
 */
export async function upload(uploads: Directory) {
    if (!app.tasks.requestNewTask()) return;

    const hasDirectories = Object.keys(uploads.directories).length > 0;

    if (!hasDirectories && uploads.files.length == 1) {
        const task = new Task("Uploading " + uploads.files[0].name, "", false);
        app.tasks.setTask(task);
        const file = uploads.files[0];
        await uploadFile(file, joinPath(app.state.workdir, file.name));
        task.complete();
        app.refresh();
    } else {
        // Count the files for the task progress
        const totalCount = countFilesRecursively(uploads);

        const task = new Task("Uploading " + totalCount + " files", "", true);
        app.tasks.setTask(task);

        // Do the uploading
        const path = new DirectoryPath(app.state.workdir);
        await uploadDirectory(uploads, task, path, 0, totalCount);

        // Refresh the current directory and clear cache
        app.refresh(true);
        
        // Complete the task
        task.complete();
    }
}

/**
 * Upload a directory to the FTP server, recursively uploading subdirectories
 * if required.
 *
 * @param directory The directory to upload.
 * @param task The task for this upload.
 * @param path The current folder being uploaded to.
 * @param uploadCount The amount of files that have already been uploaded.
 * @param totalCount The total amount of files to upload.
 * @returns The new uploadCount, the new amount of files that have been uploaded.
 */
async function uploadDirectory(directory: Directory, task: Task, path: DirectoryPath, uploadCount: number, totalCount: number): Promise<number> {
    // Upload all files
    for (const file of directory.files) {
        await uploadFile(file, joinPath(path.get(), file.name));
        uploadCount++;
        task.progress(uploadCount, totalCount, "Uploading " + file.name);
    }
    // List the current folder so we can see if the following subdirectories exist
    const list = await FolderContentProviders.MAIN.getFolderEntries(Priority.LARGE_TASK, path.get());
    // Loop trough all directories to upload
    for (const subdirName in directory.directories) {
        const subdir = directory.directories[subdirName];
        // Check if the folder already exists
        let folderExists = false;
        for (const existingFolder of list) {
            if (existingFolder.name == subdirName && existingFolder.isDirectory()) {
                folderExists = true;
                break;
            }
        }
        // If not, create the folder
        if (!folderExists) {
            task.progress(uploadCount, totalCount, "Creating " + subdirName);
            await app.state.session.mkdir(Priority.LARGE_TASK, joinPath(path.get(), subdirName));
        }
        path.cd(subdirName);
        // Upload the folder contents recursively
        // also reassign the uploadCount variable to the new uploadCount
        uploadCount = await uploadDirectory(subdir, task, path, uploadCount, totalCount);
        // We are now done with the sub directory, cd back up.
        path.cdup();
    }
    return uploadCount;
}

/**
 * Upload a file to the FTP server.
 * <p>
 * The connection can not be fetched from the session when a task is running,
 * without permission (providing the task), therefore the connection is injected
 * into this method instead.
 *
 * @param file The file to upload.
 * @param path The path on the server to upload the file to, including the file name.
 */
async function uploadFile(file: File, path: string) {
    console.log("Uploading " + file.name);
    await app.state.session.upload(Priority.LARGE_TASK, file, path);
}

/**
 * Recursively count the files in the specified directory and all it's
 * subdirectories.
 *
 * @param directory The directory to count the files in.
 * @returns The amount of files in this directory and subdirectories.
 */
function countFilesRecursively(directory: Directory): number {
    let count = directory.files.length;
    for (const subdir of Object.values(directory.directories)) {
        count += countFilesRecursively(subdir);
    }
    return count;
}

// Drag and drop

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
    if (Object.keys(uploads.directories).length == 0 && uploads.files.length == 1 && uploads.files[0].name.endsWith(".zip")) {
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
            const promise = handleItem(entry, root);
            promises.push(promise);
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