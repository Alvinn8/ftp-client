import Dialog from "../Dialog";
import download from "../download";
import FolderContentProviders from "../folder/FolderContentProviders";
import FolderEntry from "../folder/FolderEntry";
import DirectoryPath from "../ftp/DirectoryPath";
import Priority from "../ftp/Priority";
import Task from "../task/Task";
import { app } from "../ui/index";

export async function downloadFolderEntry(entry: FolderEntry) {
    const blob = await app.state.session.download(Priority.QUICK, entry.name);
    download(blob, entry.name);
}

export function rename(entry: FolderEntry) {
    Dialog.prompt("Rename "+ entry.name, "Enter the new name of the file", "Rename", entry.name, async newName => {
        const newPath = entry.path.substring(0, entry.path.length - entry.name.length) + newName;
        await app.state.session.rename(Priority.QUICK, entry.path, newPath);
        app.refresh();
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
    if (!app.tasks.requestNewTask()) return;

    
    // Counting can sometimes take a bit, start a task.
    const countTask = new Task("Delete", "Counting files to delete", false);
    app.tasks.setTask(countTask);
    const totalCount = await countFilesRecursively(entries, getDirectoryPath(entries));
    countTask.complete();

    if (totalCount > 1 && !await Dialog.confirm("Delete " + totalCount + " files", "You are about to delete "
        + totalCount + " files/folders. This can not be undone. Are you sure?")) {
        return;
    }
    
    // Delete
    const task = new Task("Deleting " + totalCount + " file" + (totalCount == 1 ? "" : "s"), "", true);
    app.tasks.setTask(task);
    const path = getDirectoryPath(entries);
    await deleteRecursively(entries, task, path, 0, totalCount);
    task.complete();
    app.refresh(true);
}

async function deleteRecursively(entries: FolderEntry[], task: Task, path: DirectoryPath, deletedCount: number, totalCount: number): Promise<number> {
    for (const entry of entries) {
        if (entry.isFile()) {
            // A file, delete it
            task.progress(deletedCount, totalCount, "Deleting " + entry.name);
            await app.state.session.delete(Priority.LARGE_TASK, entry.path);
        } else if (entry.isDirectory()) {
            // A directory, we need to recursivly delete all files in there
            path.cd(entry.name);
            const list = await FolderContentProviders.MAIN.getFolderEntries(Priority.LARGE_TASK, path.get());
            deletedCount = await deleteRecursively(list, task, path, deletedCount, totalCount);
            path.cdup();
            // then delete the directory
            task.progress(deletedCount, totalCount, "Deleting " + entry.name);
            await app.state.session.delete(Priority.LARGE_TASK, entry.path);
        }
        deletedCount++;
    }
    return deletedCount;
}

async function countFilesRecursively(entries: FolderEntry[], path: DirectoryPath): Promise<number> {
    let count = 0;
    for (const entry of entries) {
        // Count files and directories
        count++;
        // If it's a directory, count all files inside
        if (entry.isDirectory()) {
            path.cd(entry.name);
            const list = await FolderContentProviders.MAIN.getFolderEntries(Priority.LARGE_TASK, path.get());
            count += await countFilesRecursively(list, path);
            path.cdup();
        }
    }
    return count;
}

export async function downloadAsZip(entries: FolderEntry[]) {
    if (!app.tasks.requestNewTask()) return;

    // Counting can sometimes take a bit, start a task.
    const countTask = new Task("Download", "Counting files to download", false);
    app.tasks.setTask(countTask);
    const totalCount = await countFilesRecursively(entries, getDirectoryPath(entries));
    countTask.complete();

    // Download
    const task = new Task("Downloading " + totalCount + " files", "", true);
    app.tasks.setTask(task);
    // @ts-ignore
    const zip = new JSZip();
    const path = getDirectoryPath(entries);
    await downloadRecursively(entries, zip, task, path, 0, totalCount);

    // Create and download zip
    task.progress(totalCount, totalCount, "Creating zip");
    const zipFile = await zip.generateAsync({ type: "blob" });

    download(zipFile, entries.length == 1 ? entries[0].name + ".zip" : "files.zip");
    task.complete();
}

async function downloadRecursively(entries: FolderEntry[], zip: any, task: Task, path: DirectoryPath, downloadCount: number, totalCount: number): Promise<number> {
    for (const entry of entries) {
        if (entry.isFile()) {
            // A file, download it and place in the zip
            task.progress(downloadCount, totalCount, "Downloading " + entry.name);
            const blob = await app.state.session.download(Priority.LARGE_TASK, entry.path);
            zip.file(entry.name, blob);
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
    if (!app.tasks.requestNewTask()) return;

    const task = new Task("Computing size", "", false);
    app.tasks.setTask(task);
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