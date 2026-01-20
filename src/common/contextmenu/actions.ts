import JSZip from "jszip";
import Dialog from "../Dialog";
import download from "../download";
import FolderContentProviders from "../folder/FolderContentProviders";
import FolderEntry, { FolderEntryType } from "../folder/FolderEntry";
import DirectoryPath from "../ftp/DirectoryPath";
import Priority from "../ftp/Priority";
import Task from "../task/Task";
import TaskManager from "../task/TaskManager";
import { getApp } from "../ui/App";
import { formatByteSize, joinPath, parentdir, trailingSlash } from "../utils";
import { CancellationError, formatError, unexpectedErrorHandler } from "../error";
import { FileTree, FileTreeFile } from "../task/tree";
import { TreeTask } from "../task/treeTask";
import { usePath } from "../ui2/store/pathStore";
import { openChosenEditor, openEditor } from "../ui/editor/editor";
import { getSession } from "../ui2/store/sessionStore";
import { useNewUiStore } from "../ui2/store/newUiStore";
import { performWithRetry } from "../task/taskActions";
import { useRenameStore } from "../ui2/store/renameStore";
import { BlobReader, ZipWriter } from "@zip.js/zip.js";

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
            onClick: () => {
                useRenameStore.getState().setRenaming(selectedEntries[0]);
            },
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
        }).catch((err) => {
            if (err instanceof CancellationError) {
                return;
            }
            unexpectedErrorHandler("Failed to download")(err);
        });
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
        if (!newName) {
            return;
        }
        if (newName.includes("/")) {
            Dialog.message("Invalid name", "The name cannot contain slashes.");
            return;
        }
        const newPath = entry.path.substring(0, entry.path.length - entry.name.length) + newName;

        (async () => {
            const list = await FolderContentProviders.MAIN.getFolderEntries(Priority.QUICK, parentdir(entry.path));
            if (list && list.some((entry) => entry.name === newName)) {
                Dialog.message(
                    "Name already taken",
                    "A file or folder with that name already exists.",
                );
                return;
            }
            console.log("Renaming", entry.path, "to", newPath);

            try {
                await getApp().state.session.rename(Priority.QUICK, entry.path, newPath);
            } catch (err) {
                if (String(err).includes("ENOTEMPTY") || String(err).includes("ENOTDIR")) {
                    Dialog.message("Rename failed", "A file or folder with the new name already exists.");
                } else {
                    throw err;
                }
            } finally {
                getApp().refresh();
            }
        })().catch(unexpectedErrorHandler("Failed to rename"));
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
    return dir;
}

async function countEntriesToFileTree(entries: FolderEntry[], title: string, subTitle?: (treeTask: TreeTask) => string): Promise<[FileTree, TreeTask]> {
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
    return await new Promise<[FileTree, TreeTask]>((resolve, reject) => {
        const session = getSession();
        let countUntilMoreConnections = 5 * session.getConnectionPool().getTargetConnectionCount();
        const task = new TreeTask(session, rootFileTree, {
            processRootDirectory: false,
            progress: false,
            title: () => title,
            subTitle: subTitle ?? ((treeTask) => (`Found ${treeTask.count.completedFiles} file` +
                (treeTask.count.completedFiles === 1 ? "" : "s") +
                ` in ${treeTask.count.completedDirectories} folder` +
                (treeTask.count.completedDirectories === 1 ? "" : "s"))),
        }, {
            beforeDirectory: async (directory, connection) => {
                // Check cache first
                let entries = session.folderCache.get(directory.path);
                if (!entries) {
                    // Fetch if not in cache
                    try {
                        entries = await connection.list(directory.path);
                    } catch (err) {
                        if (String(err).includes("ENOENT")) {
                            // Oops, this directory does not exist. Invalidate cache
                            // and retry parent directory.
                            session.folderCache.remove(directory.path);
                            session.folderCache.remove(parentdir(directory.path));
                            directory.parent?.retry();
                            return;
                        }
                        throw err;
                    }
                    session.folderCache.set(directory.path, entries);
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
                resolve([copyFileTree(rootFileTree), task]);
            },
            cancelled(_fileTree, _connection) {
                reject(new CancellationError("Counting task was cancelled"));
            },
        });
        session.taskManager.addTreeTask(task);
    });
}

/**
 * Find size of a directory by scanning it. The size will be stored in the
 * folder cache.
 * 
 * @param entry The directory entry. Must be a directory.
 */
export async function findDirectorySize(entry: FolderEntry): Promise<void> {
    if (!entry.isDirectory()) {
        throw new Error("findDirectorySize can only be used for directories, not files.");
    }
    try {
        await countEntriesToFileTree(
            [entry],
            "Calculating folder size",
            (treeTask) => formatByteSize(treeTask.count.completedFileSize, 2)
        );
    } catch (err) {
        if (err instanceof CancellationError) {
            return;
        }
        throw err;
    }
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
    const session = getSession();
    let rootFileTree: FileTree;
    let countingTask: TreeTask | null = null;
    try {
        [rootFileTree, countingTask] = await countEntriesToFileTree(entries, "Counting files to delete");
    } catch (err) {
        if (err instanceof CancellationError) {
            return;
        }
        throw err;
    }
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
    countingTask.setNextTask(task);
}

export async function downloadAsZip(entries: FolderEntry[]) {
    const fileName = entries.length === 1 ? entries[0].name + ".zip" : "files.zip";
    if (typeof window.showSaveFilePicker === "function") {
        const opts: SaveFilePickerOptions = {
            suggestedName: fileName,
            types: [{
                description: "ZIP Archive",
                accept: { "application/zip": [".zip"] },
            }],
        }
        let fileHandle: FileSystemFileHandle;
        try {
            fileHandle = await window.showSaveFilePicker(opts)
        } catch (err) {
            if (err.name === "AbortError") {
                return;
            } else if (err.name === "NotAllowedError") {
                fileHandle = null;
            } else {
                throw err;
            }
        }
        if (fileHandle) {
            return await downloadAsZipStreaming(entries, fileHandle);
        }
    }
    let fileTree: FileTree;
    let countingTask: TreeTask | null = null;
    try {
        [fileTree, countingTask] = await countEntriesToFileTree(entries, "Counting files to download");
    } catch (err) {
        if (err instanceof CancellationError) {
            return;
        }
        throw err;
    }
    const zip = new JSZip();
    const rootPath = getDirectoryPath(entries);
    const session = getSession();
    const task = new TreeTask(session, fileTree, {
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
    });
    session.taskManager.addTreeTask(task);
    countingTask.setNextTask(task);
}

declare global {
    interface FileSystemFileHandle {
        remove(): Promise<void>;
    }
}

export async function downloadAsZipStreaming(entries: FolderEntry[], fileHandle: FileSystemFileHandle) {
    let fileTree: FileTree;
    let countingTask: TreeTask | null = null;
    try {
        [fileTree, countingTask] = await countEntriesToFileTree(entries, "Counting files to download");
    } catch (err) {
        if (err instanceof CancellationError) {
            try {
                await fileHandle.remove();
            } catch {}
            return;
        }
        throw err;
    }

    const writable = await fileHandle.createWritable(); // TODO this can throw (mostly on Linux?) fallback to non-streaming download
    const zipWriter = new ZipWriter({ writable });

    const rootPath = trailingSlash(getDirectoryPath(entries));
    function getRelativePath(fullPath: string) {
        if (fullPath.startsWith(rootPath)) {
            return fullPath.substring(rootPath.length);
        }
        throw new Error("Path " + fullPath + " is not under root path " + rootPath);
    }
    const session = getSession();
    const task = new TreeTask(session, fileTree, {
        title: (treeTask) => "Downloading " + treeTask.count.totalFiles + " files",
    }, {
        beforeDirectory: async (directory, connection) => {
            await zipWriter.add(
                getRelativePath(trailingSlash(directory.path)),
                null,
                { directory: true }
            );
        },
        afterDirectory: (directory, connection) => {},
        file: async (file, connection) => {
            const path = joinPath(file.parent.path, file.name);
            const blob = await connection.download(new FolderEntry(path, file.name, file.size, FolderEntryType.File, ""), file.progress.bind(file));
            await zipWriter.add(getRelativePath(path), new BlobReader(blob));
        },
        done: async (fileTree, connection) => {
            await zipWriter.close();
        },
        cancelled: async (fileTree, connection) => {
            try {
                await zipWriter.close();
            } catch {}
            try {
                await writable.close();
            } catch {}
            try {
                await fileHandle.remove();
            } catch {}
        },
    });
    if (countingTask) {
        countingTask.setNextTask(task);
    }
    session.taskManager.addTreeTask(task);
}

export async function computeSize(entries: FolderEntry[]): Promise<number> {
    if (!TaskManager.requestNewTask()) return;

    const task = new Task("Computing size", "", false);
    TaskManager.setTask(task);
    const path = new DirectoryPath(getDirectoryPath(entries));
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
