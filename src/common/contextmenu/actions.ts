import Dialog from "../Dialog";
import download from "../download";
import FolderContentProviders from "../folder/FolderContentProviders";
import FolderEntry from "../folder/FolderEntry";
import DirectoryPath from "../ftp/DirectoryPath";
import Task from "../task/Task";
import { app } from "../ui/index";

export async function downloadFolderEntry(entry: FolderEntry) {
    const connection = await app.state.session.getConnection();
    const blob = await connection.download(entry.name);
    download(blob, entry.name);
}

export function rename(entry: FolderEntry) {
    Dialog.prompt("Rename "+ entry.name, "Enter the new name of the file", "Rename", entry.name, async newName => {
        const connection = await app.state.session.getConnection();
        const newPath = entry.path.substring(0, entry.path.length - entry.name.length) + newName;
        await connection.rename(entry.path, newPath);
        await app.state.session.refresh();
    });
}

export async function deleteFolderEntries(entries: FolderEntry[]) {
    if (!app.tasks.requestNewTask()) return;

    // Counting can sometimes take a bit, start a task.
    const countTask = new Task("Delete", "Counting files to delete", false);
    app.tasks.setTask(countTask);
    const totalCount = await countFilesRecursively(entries);
    countTask.complete();

    // Delete
    const task = new Task("Deleting " + totalCount + " file" + (totalCount == 1 ? "" : "s"), "", true);
    app.tasks.setTask(task);
    const path = new DirectoryPath(app.state.session.workdir);
    await deleteRecursively(entries, task, path, 0, totalCount);
    task.complete();
    await app.state.session.refresh();
}

async function deleteRecursively(entries: FolderEntry[], task: Task, path: DirectoryPath, deletedCount: number, totalCount: number): Promise<number> {
    const connection = await app.state.session.getConnection(task);
    for (const entry of entries) {
        if (entry.isFile()) {
            // A file, delete it
            task.progress(deletedCount, totalCount, "Deleting " + entry.name);
            await connection.delete(entry.path);
        } else if (entry.isDirectory()) {
            // A directory, we need to recursivly delete all files in there
            path.cd(entry.name);
            const list = await FolderContentProviders.MAIN.getFolderEntries(path.get());
            deletedCount = await deleteRecursively(list, task, path, deletedCount, totalCount);
            path.cdup();
            // then delete the directory
            task.progress(deletedCount, totalCount, "Deleting " + entry.name);
            await connection.delete(entry.path);
        }
        deletedCount++;
    }
    return deletedCount;
}

async function countFilesRecursively(entries: FolderEntry[], path?: DirectoryPath): Promise<number> {
    if (!path) {
        path = new DirectoryPath(app.state.session.workdir);
    }
    let count = 0;
    for (const entry of entries) {
        // Count files and directories
        count++;
        // If it's a directory, cd into it and count all files inside
        if (entry.isDirectory()) {
            path.cd(entry.name);
            const list = await FolderContentProviders.MAIN.getFolderEntries(path.get());
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
    const totalCount = await countFilesRecursively(entries);
    countTask.complete();

    // Download
    const task = new Task("Downloading " + totalCount + " files", "", true);
    app.tasks.setTask(task);
    // @ts-ignore
    const zip = new JSZip();
    const path = new DirectoryPath(app.state.session.workdir);
    await downloadRecursively(entries, zip, task, path, 0, totalCount);

    // Create and download zip
    task.progress(totalCount, totalCount, "Creating zip");
    const zipFile = await zip.generateAsync({ type: "blob" });

    download(zipFile, entries.length == 1 ? entries[0].name + ".zip" : "files.zip");
    task.complete();
}

async function downloadRecursively(entries: FolderEntry[], zip: any, task: Task, path: DirectoryPath, downloadCount: number, totalCount: number): Promise<number> {
    const connection = await app.state.session.getConnection(task);
    for (const entry of entries) {
        if (entry.isFile()) {
            // A file, download it and place in the zip
            task.progress(downloadCount, totalCount, "Downloading " + entry.name);
            const blob = await connection.download(entry.path);
            zip.file(entry.name, blob);
        } else if (entry.isDirectory()) {
            path.cd(entry.name);
            const list = await FolderContentProviders.MAIN.getFolderEntries(path.get());
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
    const path = new DirectoryPath(app.state.session.workdir);
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
            const list = await FolderContentProviders.MAIN.getFolderEntries(path.get());
            size += await computeSizeRecursively(list, task, path);
            path.cdup();
        }
    }
    return size;
}