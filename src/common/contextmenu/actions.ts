import JSZip from "jszip";
import Dialog from "../Dialog";
import download from "../download";
import FolderContentProviders from "../folder/FolderContentProviders";
import FolderEntry from "../folder/FolderEntry";
import DirectoryPath from "../ftp/DirectoryPath";
import Priority from "../ftp/Priority";
import Task from "../task/Task";
import TaskManager from "../task/TaskManager";
import { getApp } from "../ui/App";
import { sleep } from "../utils";

export async function downloadFolderEntry(entry: FolderEntry) {
    try {
        const blob = await getApp().state.session.download(Priority.QUICK, entry);
        download(blob, entry.name);
    } catch(e) {
        Dialog.message("Failed to download", String(e));
    }
}

export function rename(entry: FolderEntry) {
    Dialog.prompt("Rename "+ entry.name, "Enter the new name of the file", "Rename", entry.name, async newName => {
        const newPath = entry.path.substring(0, entry.path.length - entry.name.length) + newName;
        await getApp().state.session.rename(Priority.QUICK, entry.path, newPath);
        getApp().refresh();
    });
}

/**
 * Get the directory that the list of entries are in.
 *
 * The entries must be in the same directory.
 * 
 * @param entries The entries.
 * @returns The directory path.
 */
function getDirectoryPath(entries: FolderEntry[]) {
    let dir: string | null = null;
    for (const entry of entries) {
        const dir0 = entry.path.substring(0, entry.path.length - entry.name.length - 1);
        if (dir == null) {
            dir = dir0;
        }
        if (dir != dir0) {
            throw new Error("Multiple entries were from different directories. dir: " + dir + ", dir0: " + dir0);
        }
    }
    if (dir == null) {
        throw new Error("No entries for getDirectory call.");
    }
    return new DirectoryPath(dir);
}

export async function deleteFolderEntries(entries: FolderEntry[]) {
    if (!TaskManager.requestNewTask()) return;
    
    // Counting can sometimes take a bit, start a task.
    const countTask = new CountTask("Delete", "Counting files to delete", false);
    TaskManager.setTask(countTask);
    let totalCount: number | null = null;
    try {
        totalCount = await countFilesRecursively(entries, getDirectoryPath(entries), countTask);
    } catch (e) {
        countTask.complete();
        Dialog.message(
            "Delete failed",
            `Failed to count files to delete. Error: ${e}`
        );
        return;
    }
    countTask.complete();

    const description = totalCount === 1 && entries[0]
        ? entries[0].name
        : totalCount + (totalCount === 1 ? " file" : " files");

    if (!await Dialog.confirm("Delete " + description, "You are about to delete "
        + description +". This can not be undone. Are you sure?")) {
        return;
    }
    
    // Delete
    const task = new Task("Deleting " + totalCount + " file" + (totalCount == 1 ? "" : "s"), "", true);
    TaskManager.setTask(task);
    const path = getDirectoryPath(entries);
    try {
        await deleteRecursively(entries, task, path, 0, totalCount);
    } catch (e) {
        if (String(e) != "Error: Use chose to cancel.") {
            Dialog.message("Unexpected error while deleting", String(e));
        }
    }
    task.complete();
    getApp().refresh(true);
}

async function deleteRecursively(entries: FolderEntry[], task: Task, path: DirectoryPath, deletedCount: number, totalCount: number): Promise<number> {
    for (const entry of entries) {
        if (entry.isFile()) {
            // A file, delete it
            task.progress(deletedCount, totalCount, "Deleting " + entry.name);
            try {
                await getApp().state.session.delete(Priority.LARGE_TASK, entry.path);
            } catch (e) {
                if (String(e).includes("ENOENT")) {
                    // Ignore, it looks like this has already been deleted.
                } else {
                    const shouldContinue = Dialog.confirm("Failed to delete", "Failed to delete " + entry.path + ". The error was: " + e + ". Do you want to continue deleting or cancel?", "Cancel", "Continue deleting");
                    if (!shouldContinue) {
                        throw new Error("Use chose to cancel.");
                    }
                }
            }
        } else if (entry.isDirectory()) {
            // A directory, we need to recursivly delete all files in there
            path.cd(entry.name);
            const list = await FolderContentProviders.MAIN.getFolderEntries(Priority.LARGE_TASK, path.get());
            deletedCount = await deleteRecursively(list, task, path, deletedCount, totalCount);
            path.cdup();
            // then delete the directory
            task.progress(deletedCount, totalCount, "Deleting " + entry.name);
            try {
                await getApp().state.session.delete(Priority.LARGE_TASK, entry.path);
            } catch (e) {
                if (String(e).includes("ENOENT")) {
                    // Ignore, it looks like this has already been deleted.
                } else if (String(e).includes("ENOTEMPTY")) {
                    Dialog.message("Files changed while deleting", "It appears new files were added while trying to delete files. Please refresh and try deleting again. If your server is running, you may want to concider stopping it if you are deleting files that the server is using and writing to.");
                    throw new Error("Use chose to cancel.");
                } else {
                    const shouldContinue = Dialog.confirm("Failed to delete", "Failed to delete " + entry.path + ". The error was: " + e + ". Do you want to continue deleting or cancel?", "Cancel", "Continue deleting");
                    if (!shouldContinue) {
                        throw new Error("Use chose to cancel.");
                    }
                }
            }
        }
        deletedCount++;
    }
    return deletedCount;
}

class CountTask extends Task {
    private count = 0;

    public setCount(count: number) {
        this.count = count;
        this.progress(this.count, 0, this.body + ": " + this.count);
    }

    public increment() {
        this.setCount(this.count + 1);
    }
}

async function countFilesRecursively(entries: FolderEntry[], path: DirectoryPath, countTask: CountTask): Promise<number> {
    let count = 0;
    for (const entry of entries) {
        // Count files and directories
        count++;
        countTask.increment();
        // If it's a directory, count all files inside
        if (entry.isDirectory()) {
            path.cd(entry.name);
            let list: FolderEntry[] | null = null;
            let attempt = 0;
            while (attempt < 5) {
                try {
                    list = await FolderContentProviders.MAIN.getFolderEntries(Priority.LARGE_TASK, path.get());
                    break;
                } catch (e) {
                    attempt++;
                    await sleep(1000 * attempt);
                }
            }
            if (list === null) {
                throw new Error("Failed to count files in " + path.get());
            }
            count += await countFilesRecursively(list, path, countTask);
            path.cdup();
        }
    }
    return count;
}

export async function downloadAsZip(entries: FolderEntry[]) {
    if (!TaskManager.requestNewTask()) return;

    // Counting can sometimes take a bit, start a task.
    const countTask = new CountTask("Download", "Counting files to download", false);
    TaskManager.setTask(countTask);
    let totalCount: number | null = null;
    try {
        totalCount = await countFilesRecursively(entries, getDirectoryPath(entries), countTask);
    } catch (e) {
        countTask.complete();
        Dialog.message(
            "Download failed",
            `Failed to count files to download. Error: ${e}`
        );
        return;
    }
    countTask.complete();

    // Download
    const task = new Task("Downloading " + totalCount + " files", "", true);
    TaskManager.setTask(task);
    const zip = new JSZip();
    const path = getDirectoryPath(entries);
    
    try {
        await downloadRecursively(entries, zip, task, path, 0, totalCount);

        // Create and download zip
        task.progress(totalCount, totalCount, "Creating zip");
        const zipFile = await zip.generateAsync({ type: "blob" }, (metadata) => {
            task.progress(metadata.percent, 100, "Creating zip");
        });

        task.progress(100, 100, "Downloading zip");
        download(zipFile, entries.length == 1 ? entries[0].name + ".zip" : "files.zip");
        task.complete();
    } catch (e) {
        Dialog.message(
            "Download failed",
            `The download failed even after several attempts. Error: ${e}`
        );
        task.complete();
    }
}

async function downloadRecursively(entries: FolderEntry[], zip: JSZip, task: Task, path: DirectoryPath, downloadCount: number, totalCount: number): Promise<number> {
    for (const entry of entries) {
        if (entry.isFile()) {
            // A file, download it and place in the zip
            task.progress(downloadCount, totalCount, "Downloading " + entry.name);
            
            // Try downloading the file up to 5 times
            let attempt = 0;
            const maxAttempts = 5;
            let success = false;
            let lastError: Error | null = null;
            
            while (attempt < maxAttempts) {
                try {
                    const blob = await getApp().state.session.download(Priority.LARGE_TASK, entry);
                    zip.file(entry.name, blob);
                    success = true;
                    break;
                } catch (e) {
                    lastError = e as Error;
                    attempt++;
                    if (attempt < maxAttempts) {
                        task.progress(downloadCount, totalCount, `Retrying download of ${entry.name} (attempt ${attempt + 1}/${maxAttempts})`);
                        await sleep(1000 * attempt);
                    }
                }
            }
            
            if (!success) {
                console.error(`Failed to download ${entry.name} after ${attempt} attempts. lastError =`, lastError);
                throw lastError || new Error(`Failed to download ${entry.name} after ${attempt} attempts.`);
            }
            
        } else if (entry.isDirectory()) {
            path.cd(entry.name);
            const list = await FolderContentProviders.MAIN.getFolderEntries(Priority.LARGE_TASK, path.get());
            const zipFolder = zip.folder(entry.name);
            downloadCount = await downloadRecursively(list, zipFolder, task, path, downloadCount, totalCount);
            path.cdup();
        }
        downloadCount++;
    }
    return downloadCount;
}

export async function computeSize(entries: FolderEntry[]): Promise<number> {
    if (!TaskManager.requestNewTask()) return;

    const task = new Task("Computing size", "", false);
    TaskManager.setTask(task);
    const path = getDirectoryPath(entries);
    const size = await computeSizeRecursively(entries, task, path);
    task.complete();
    return size;
}

async function computeSizeRecursively(entries: FolderEntry[], task: Task, path: DirectoryPath): Promise<number> {
    let size = 0;
    for (const entry of entries) {
        if (entry.isFile()) {
            size += entry.size;
        } else if (entry.isDirectory()) {
            task.progress(0, 0, "Computing size of " + entry.name);
            path.cd(entry.name);
            const list = await FolderContentProviders.MAIN.getFolderEntries(Priority.LARGE_TASK, path.get());
            size += await computeSizeRecursively(list, task, path);
            path.cdup();
        }
    }
    return size;
}
