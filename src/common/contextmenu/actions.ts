import JSZip, { remove } from "jszip";
import Dialog from "../Dialog";
import download from "../download";
import FolderContentProviders from "../folder/FolderContentProviders";
import FolderEntry, { FolderEntryType } from "../folder/FolderEntry";
import DirectoryPath from "../ftp/DirectoryPath";
import Priority from "../ftp/Priority";
import Task from "../task/Task";
import TaskManager from "../task/TaskManager";
import { getApp } from "../ui/App";
import { joinPath, parentdir, sleep } from "../utils";
import { CancellationError, formatError, unexpectedErrorHandler } from "../error";
import { FileTree, FileTreeFile, Status } from "../task/tree";
import { TreeTask } from "../task/treeTask";
import { usePath } from "../ui2/store/pathStore";
import { openChosenEditor, openEditor } from "../ui/editor/editor";
import { getSession } from "../ui2/store/sessionStore";
import { useNewUiStore } from "../ui2/store/newUiStore";
import { performWithRetry } from "../task/taskActions";

const useTreeTasks = true;

interface Action {
    icon: string;
    label: string;
    onClick: () => void;
    alternatives?: { label: string; onClick: () => void }[];
}

export function getActions(selectedEntries: FolderEntry[]): Action[] {
    const actions: Action[] = [];
    if (selectedEntries.length === 0) {
        return actions;
    }
    const one = selectedEntries.length === 1;
    const oneFile = one && selectedEntries[0].isFile();
    const oneDirectory = one && selectedEntries[0].isDirectory();
    if (oneDirectory) {
        actions.push({
            icon: "folder2-open",
            label: "Open",
            onClick: () => {
                const setPath = usePath.getState().setPath;
                setPath(selectedEntries[0].path);
            },
        });
    }
    if (oneFile) {
        actions.push({
            icon: "box-arrow-up-right",
            label: "Open",
            onClick: () => {
                openEditor(selectedEntries[0]).catch(
                    unexpectedErrorHandler("Failed to open"),
                );
            },
            alternatives: [{
                label: "Open as",
                onClick: () => {
                    openChosenEditor(selectedEntries[0]).catch(
                        unexpectedErrorHandler("Failed to open"),
                    );
                }
            }]
        });
    }
    if (oneFile) {
        actions.push({
            icon: "download",
            label: "Download",
            onClick: () => {
                downloadFolderEntry(selectedEntries[0]).catch(
                    unexpectedErrorHandler("Failed to download")
                )
            },
        });
    } else {
        actions.push({
            icon: "download",
            label: "Download",
            onClick: () => {
                downloadAsZip(selectedEntries).catch(
                    unexpectedErrorHandler("Failed to download")
                )
            }
        });
    }
    if (one) {
        actions.push({
            icon: "pencil",
            label: "Rename",
            onClick: () => rename(selectedEntries[0]),
        });
    }
    actions.push({
        icon: "trash",
        label: "Delete",
        onClick: () => {
            deleteFolderEntries(selectedEntries).catch(
                unexpectedErrorHandler("Failed to delete")
            );
        }
    });
    return actions;
}

export async function downloadFolderEntry(entry: FolderEntry) {
    console.log("Download one folder entry");
    if (useNewUiStore.getState().useNewUi) {
        performWithRetry(getSession(), parentdir(entry.path), async (connection) => {
            const blob = await connection.download(entry);
            download(blob, entry.name);
        }).catch(unexpectedErrorHandler("Failed to download"));
        return;
    }
    try {
        const blob = await getApp().state.session.download(Priority.QUICK, entry);
        download(blob, entry.name);
    } catch(err) {
        Dialog.message("Failed to download", formatError(err));
    }
}

export function rename(entry: FolderEntry) {
    Dialog.prompt("Rename "+ entry.name, "Enter the new name of the file", "Rename", entry.name, newName => {
        const newPath = entry.path.substring(0, entry.path.length - entry.name.length) + newName;
        console.log("Renaming", entry.path, "to", newPath);
        if (useNewUiStore.getState().useNewUi) {
            performWithRetry(getSession(), parentdir(entry.path), async (connection) => {
                try {
                    await connection.rename(entry.path, newPath);
                } catch(err) {
                    if (String(err).includes("ENOTEMPTY") || String(err).includes("ENOTDIR")) {
                        Dialog.message("Rename failed", "A file or folder with the new name already exists.");
                    } else {
                        unexpectedErrorHandler("Failed to rename")(err);
                    }
                }
            }).catch(unexpectedErrorHandler("Failed to rename"));
        } else {
            getApp().state.session.rename(Priority.QUICK, entry.path, newPath)
                .catch(err => {
                    if (String(err).includes("ENOTEMPTY") || String(err).includes("ENOTDIR")) {
                        Dialog.message("Rename failed", "A file or folder with the new name already exists.");
                    } else {
                        unexpectedErrorHandler("Failed to rename")(err);
                    }
                })
                .finally(() => {
                getApp().refresh();
                });
        }
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

async function entriesToFileTree(entries: FolderEntry[]): Promise<FileTree> {
    let commonParent = parentdir(entries[0].path);
    const rootFileTree = new FileTree(commonParent);
    for (const entry of entries) {
        const parent = parentdir(entry.path);
        if (parent !== commonParent) {
            throw new Error("Entries are not in the same directory. Common parent: " + commonParent + ", entry parent: " + parent);
        }
       if (entry.isFile()) {
            rootFileTree.addEntry(new FileTreeFile(entry.name, null, entry.size, rootFileTree));
        } else if (entry.isDirectory()) {
            const dirTree = await entryToFileTree(entry);
            rootFileTree.addEntry(dirTree);
        }
    }
    return rootFileTree;
}

async function entryToFileTree(entry: FolderEntry): Promise<FileTree> {
    if (!entry.isDirectory()) {
        throw new Error("entryToFileTree can only be used for directories, not files.");
    }
    // For directories, get their contents and recursively build the tree
    const list = await FolderContentProviders.MAIN.getFolderEntries(Priority.LARGE_TASK, entry.path);
    const dirTree = new FileTree(entry.path);
    for (const subEntry of list) {
        if (subEntry.isFile()) {
            dirTree.addEntry(new FileTreeFile(subEntry.name, null, subEntry.size, dirTree));
        } else {
            dirTree.addEntry(await entryToFileTree(subEntry));
        }
    }
    return dirTree;
}

async function countEntriesToFileTree(entries: FolderEntry[], title: string): Promise<FileTree> {
    let commonParent = parentdir(entries[0].path);
    // Create a shallow file tree
    const rootFileTree = new FileTree(commonParent);
    for (const entry of entries) {
        const parent = parentdir(entry.path);
        if (parent !== commonParent) {
            throw new Error("Entries are not in the same directory. Common parent: " + commonParent + ", entry parent: " + parent);
        }
       if (entry.isFile()) {
            rootFileTree.addEntry(new FileTreeFile(entry.name, null, entry.size, rootFileTree));
        } else if (entry.isDirectory()) {
            rootFileTree.addEntry(new FileTree(entry.path));
        }
    }
    // Start a tree task that will add to the file tree
    return await new Promise<FileTree>((resolve, reject) => {
        const session = getSession();
        let countUntilMoreConnections = 5 * session.getConnectionPool().getTargetConnectionCount();
        const task = new TreeTask(session, rootFileTree, {
            processRootDirectory: false,
            progress: false,
            title: () => title,
            subTitle: (treeTask) => (`Found ${treeTask.count.completedFiles} file` +
                (treeTask.count.completedFiles === 1 ? "" : "s") +
                ` in ${treeTask.count.completedDirectories} folder` +
                (treeTask.count.completedDirectories === 1 ? "" : "s")),
        }, {
            beforeDirectory: async (directory, connection) => {
                // Check cache first
                let entries = session.folderCache.get(directory.path);
                if (!entries) {
                    // Fetch if not in cache
                    entries = await connection.list(directory.path);
                    countUntilMoreConnections--;
                    if (countUntilMoreConnections <= 0) {
                        // Seems like we have quite a lot of nested directories.
                        // Time to increase the amount of parallel connections.
                        const connectionPool = session.getConnectionPool();
                        const currentCount = connectionPool.getTargetConnectionCount();
                        connectionPool.setTargetConnectionCount(
                            Math.min(10, currentCount + 1)
                        );
                        countUntilMoreConnections = 5 * connectionPool.getTargetConnectionCount();
                    }
                }
                // Add files and nested directories to the file tree.
                const existingEntries = directory.getEntries();
                for (const entry of entries) {
                    if (entry.isFile()) {
                        if (existingEntries.find(e => e instanceof FileTreeFile && e.name === entry.name)) {
                            continue;
                        }
                        directory.addEntry(new FileTreeFile(entry.name, null, entry.size, directory));
                    } else if (entry.isDirectory()) {
                        if (existingEntries.find(e => e instanceof FileTree && e.path === entry.path)) {
                            continue;
                        }
                        directory.addEntry(new FileTree(entry.path));
                    }
                }
            },
            afterDirectory: async (_directory, _connection) => {},
            file: async (_file, _connection) => {},
            done(_fileTree, _connection) {
                // The file tree will now have status DONE. Copy it.
                resolve(copyFileTree(rootFileTree));
            },
            cancelled(_fileTree, _connection) {
                reject(new CancellationError("Counting task was cancelled"));
            },
        });
        session.taskManager.addTreeTask(task);
    });
}

function copyFileTree(fileTree: FileTree): FileTree {
    const newTree = new FileTree(fileTree.path);
    for (const entry of fileTree.getEntries()) {
        if (entry instanceof FileTreeFile) {
            const newFile = new FileTreeFile(entry.name, null, entry.size, newTree);
            newTree.addEntry(newFile);
        } else if (entry instanceof FileTree) {
            const newSubTree = copyFileTree(entry);
            newTree.addEntry(newSubTree);
        }
    }
    return newTree;
}

export async function deleteFolderEntries(entries: FolderEntry[]) {
    if (!TaskManager.requestNewTask()) return;

    if (useTreeTasks) {
        const session = getSession();
        const rootFileTree = await countEntriesToFileTree(entries, "Counting files to delete");
        const task = new TreeTask(session, rootFileTree, {
            title: (treeTask) => "Deleting " + treeTask.count.totalFiles + " file" + (treeTask.count.totalFiles == 1 ? "" : "s"),
            // It is important that we do not process the root directory,
            // as it is the container for the files we want to delete.
            // We do not want to delete the container itself.
            processRootDirectory: false
        }, {
            beforeDirectory(directory, connection) {},
            async afterDirectory(directory, connection) {
                try {
                    await connection.delete(directory.path);
                } catch (err) {
                    if (String(err).includes("ENOTEMPTY")) {
                        // Files were likely added while deleting, we must refresh.
                        const list = await connection.list(directory.path);
                        for (const entry of list) {
                            const node = entry.isDirectory()
                                ? directory.getEntries().filter(e => e instanceof FileTree).find(e => e.path === entry.path)
                                : directory.getEntries().filter(e => e instanceof FileTreeFile).find(e => e.name === entry.name);
                            if (node) {
                                node.retry();
                            } else if (entry.isFile()) {
                                directory.addEntry(new FileTreeFile(entry.name, null, entry.size, directory));
                            } else if (entry.isDirectory()) {
                                // We just add the sub directory, but not its contents.
                                // If it has contents, it will also throw ENOTEMPTY and
                                // this code will run again for that directory.
                                directory.addEntry(new FileTree(entry.path));
                            }
                        }
                    } else if (!String(err).includes("ENOENT")) {
                        // Ignore ENOENT, it means the directory was already deleted.
                        // Otherwise throw unexpected errors.
                        throw err;
                    }
                }
                if (useNewUiStore.getState().useNewUi) {
                    getSession().folderCache.remove(directory.path);
                } else {
                    const app = getApp();
                    delete app.state.session.cache[directory.path];
                    if (app.state.workdir === directory.path) {
                        app.refresh();
                    }
                }
            },
            async file(file, connection) {
                try {
                    await connection.delete(joinPath(file.parent.path, file.name));
                } catch (err) {
                    // Ignore if it looks like this file has already been deleted.
                    if (!String(err).includes("ENOENT")) {
                        throw err;
                    }
                    
                }
            },
            done(fileTree, connection) {
                if (useNewUiStore.getState().useNewUi) {
                    getSession().folderCache.remove(fileTree.path);
                } else {
                    const app = getApp();
                    delete app.state.session.cache[fileTree.path];
                    if (app.state.workdir === fileTree.path) {
                        app.refreshWithoutClear();
                    }
                }
            },
        });
        const description = task.count.totalFiles === 1 && entries[0]
            ? entries[0].name
            : task.count.totalFiles + (task.count.totalFiles === 1 ? " file" : " files");

        if (!await Dialog.confirm("Delete " + description, "You are about to delete "
            + task.count.totalFiles +" file" +
            (task.count.totalFiles === 1 ? "" : "s") + " and "+
            task.count.totalDirectories +" folder" +
            (task.count.totalDirectories === 1 ? "" : "s") + ". "+
            "This can not be undone. Are you sure?")) {
            return;
        }
        session.taskManager.addTreeTask(task);
        return;
    }
    if (!TaskManager.requestNewTask()) return;
    
    // Counting can sometimes take a bit, start a task.
    const countTask = new CountTask("Delete", "Counting files to delete", false);
    TaskManager.setTask(countTask);
    let totalCount: number | null = null;
    try {
        totalCount = await countFilesRecursively(entries, getDirectoryPath(entries), countTask);
    } catch (err) {
        countTask.complete();
        Dialog.message(
            "Delete failed",
            `Failed to count files to delete. ${formatError(err)}`
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
    } catch (err) {
        if (String(err) != "Error: Use chose to cancel.") {
            Dialog.message("Unexpected error while deleting", formatError(err));
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
            } catch (err) {
                if (String(err).includes("ENOENT")) {
                    // Ignore, it looks like this has already been deleted.
                } else {
                    const shouldContinue = await Dialog.confirm("Failed to delete", "Failed to delete " + entry.path + ". The error was: " + err + ". Do you want to continue deleting or cancel?", "Cancel", "Continue deleting");
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
            } catch (err) {
                if (String(err).includes("ENOENT")) {
                    // Ignore, it looks like this has already been deleted.
                } else if (String(err).includes("ENOTEMPTY")) {
                    Dialog.message("Files changed while deleting", "It appears new files were added while trying to delete files. Please refresh and try deleting again. If your server is running, you may want to concider stopping it if you are deleting files that the server is using and writing to.");
                    throw new Error("Use chose to cancel.");
                } else {
                    const shouldContinue = await Dialog.confirm("Failed to delete", "Failed to delete " + entry.path + ". The error was: " + formatError(err) + ". Do you want to continue deleting or cancel?", "Cancel", "Continue deleting");
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

/** @deprecated */
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
            let lastError: unknown;
            while (attempt < 5) {
                try {
                    list = await FolderContentProviders.MAIN.getFolderEntries(Priority.LARGE_TASK, path.get());
                    break;
                } catch (err) {
                    attempt++;
                    lastError = err;
                    await sleep(1000 * attempt);
                }
            }
            if (list === null) {
                throw new Error("Failed to count files in " + path.get(), { cause: lastError });
            }
            count += await countFilesRecursively(list, path, countTask);
            path.cdup();
        }
    }
    return count;
}

export async function downloadAsZip(entries: FolderEntry[]) {
    if (useTreeTasks) {
        let fileTree: FileTree;
        try {
            fileTree = await countEntriesToFileTree(entries, "Counting files to download");
        } catch (err) {
            if (err instanceof CancellationError) {
                return;
            }
            throw err;
        }
        const zip = new JSZip();
        const rootPath = getDirectoryPath(entries).get();
        const fileName = entries.length === 1 ? entries[0].name + ".zip" : "files.zip";
        const session = getSession();
        session.taskManager.addTreeTask(new TreeTask(session, fileTree, {
            title: (treeTask) => "Downloading " + treeTask.count.totalFiles + " files",
        }, {
            beforeDirectory: (directory, connection) => {
                zip.folder(directory.path);
            },
            afterDirectory: (directory, connection) => {},
            file: async (file, connection) => {
                const path = joinPath(file.parent.path, file.name);
                const blob = await connection.download(new FolderEntry(path, file.name, file.size, FolderEntryType.File, ""), file.progress.bind(file));
                zip.file(path, blob);
            },
            done: async (fileTree, connection) => {
                const rootFolder = zip.folder(rootPath) || zip;
                const blob = await rootFolder.generateAsync({ type: "blob" });
                download(blob, fileName);
            }
        }));
        return;
    }

    if (!TaskManager.requestNewTask()) return;

    // Counting can sometimes take a bit, start a task.
    const countTask = new CountTask("Download", "Counting files to download", false);
    TaskManager.setTask(countTask);
    let totalCount: number | null = null;
    try {
        totalCount = await countFilesRecursively(entries, getDirectoryPath(entries), countTask);
    } catch (err) {
        countTask.complete();
        Dialog.message(
            "Download failed",
            `Failed to count files to download. ${formatError(err)}`
        );
        return;
    }
    countTask.complete();

    // Download
    if (!TaskManager.requestNewTask()) return;
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
    } catch (err) {
        Dialog.message(
            "Download failed",
            `The download failed even after several attempts. ${formatError(err)}`
        );
        task.complete();
    }
}

/** @deprecated */
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
                } catch (err) {
                    lastError = err as Error;
                    attempt++;
                    if (attempt < maxAttempts) {
                        task.progress(downloadCount, totalCount, `Retrying download of ${entry.name} (attempt ${attempt + 1}/${maxAttempts})`);
                        await sleep(1000 * attempt);
                    }
                }
            }
            
            if (!success) {
                console.error(`Failed to download ${entry.name} after ${attempt} attempts. lastError =`, lastError);
                throw new Error(`Failed to download ${entry.name} with size ${entry.size} after ${attempt} attempts.`, { cause: lastError });
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
