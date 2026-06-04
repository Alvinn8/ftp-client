import FTPSession from "@common/ftp/FTPSession";
import { FileTree, FileTreeFile, Status } from "@common/task/tree";
import { TreeTask } from "@common/task/treeTask";
import { usePath } from "@common/ui/store/pathStore";
import { useSession } from "@common/ui/store/sessionStore";
import {
    dirname,
    filename,
    joinPath,
    noTrailingSlash,
} from "@common/util/utils";
import Directory from "./Directory";

const LARGE_FILE_THRESHOLD = 10e6; // 10 MB

const CHUNK_SIZES = [
    512 * 1024, // 512 kB
    2 * 1024 * 1024, // 2 MB
    8 * 1024 * 1024, // 8 MB
];
const DEFAULT_CHUNK_SIZE = CHUNK_SIZES[0];
const DECREASE_CHUNK_SIZE_THRESHOLD = 5000; // 5 s
const INCREASE_CHUNK_SIZE_THRESHOLD = 500; // 500 ms

/**
 * Upload the uploads to the current directory to the FTP server.
 *
 * @param uploads The contents to upload.
 */
export function upload(uploads: Directory) {
    uploadUsingTreeTask(uploads);
}

type UploadData = {
    file: File;
    partial?: boolean;
};

function uploadsToTree(uploads: Directory, path: string): FileTree<UploadData> {
    const root: FileTree<UploadData> = new FileTree(path);
    for (const file of uploads.files) {
        root.addEntry(
            new FileTreeFile(file.name, { file: file }, file.size, root),
        );
    }
    for (const [name, subdir] of uploads.directories.entries()) {
        const subTree = uploadsToTree(subdir, joinPath(path, name));
        root.addEntry(subTree);
    }
    return root;
}

function uploadUsingTreeTask(uploads: Directory) {
    let workdir: string;
    let session: FTPSession;
    workdir = usePath.getState().path;
    session = useSession.getState().getSession();

    const tree = uploadsToTree(uploads, workdir);
    session.taskManager.addTreeTask(
        new TreeTask(
            session,
            tree,
            {
                processRootDirectory: true,
                title: (treeTask) =>
                    treeTask.count.totalDirectories === 0 &&
                    treeTask.count.totalFiles === 1
                        ? "Uploading " +
                          (treeTask.fileTree.getEntries()[0] as FileTreeFile)
                              .name
                        : "Uploading " + treeTask.count.totalFiles + " files",
            },
            {
                beforeDirectory: async (node, connection) => {
                    if (node.path === "/") {
                        // No need to create the root directory.
                        return;
                    }
                    // Check if the directory exists
                    let exists = false;
                    const name = filename(noTrailingSlash(node.path));
                    const list = await connection.list(
                        dirname(noTrailingSlash(node.path)),
                    );
                    for (const entry of list) {
                        if (entry.name === name && entry.isDirectory()) {
                            exists = true;
                            break;
                        } else if (entry.name === name && entry.isFile()) {
                            return node.errorWithUserAction(
                                `Wanted to create a folder at ${node.path} but there is a file ` +
                                    `at that location. You can either go and delete this file, and then ` +
                                    `retry, or you can skip this folder.`,
                            );
                        }
                    }
                    if (!exists) {
                        await connection.mkdir(node.path);
                    }
                },
                afterDirectory: async (node, connection) => {
                    // Double check that all files were uploaded correctly
                    const list = await connection.list(node.path);
                    let allGood = true;
                    for (const entry of node.getEntries()) {
                        if (entry instanceof FileTreeFile) {
                            if (entry.getStatus() == Status.CANCELLED) {
                                continue;
                            }
                            const fileInfo = list.find(
                                (f) => f.name === entry.name,
                            );
                            if (
                                fileInfo &&
                                fileInfo.size === entry.data.file.size
                            ) {
                                continue;
                            }
                            allGood = false;
                            const error = new Error(
                                `File ${joinPath(node.path, entry.name)} was not uploaded properly. Expected size ${entry.data.file.size} but found ${fileInfo ? fileInfo.size : "nothing"}`,
                            );
                            console.log(error.message);
                            entry.setError(error);
                            entry.retry();
                        }
                    }
                    // Update cache
                    useSession
                        .getState()
                        .getSession()
                        .folderCache.set(node.path, list);
                },
                file: async (node, connection) => {
                    const path = joinPath(node.parent.path, node.name);

                    // Small files
                    if (node.data.file.size <= LARGE_FILE_THRESHOLD) {
                        await connection.uploadSmall(node.data.file, path);
                        return;
                    }

                    // Chunked upload for large files
                    let startOffset: number | null = null;
                    if (node.data.partial) {
                        // The file was partially uploaded before, and then paused or failed.
                        // We need to check the size of the file on the server and resume
                        // the upload from that point.
                        const fileInfo = await connection.list(
                            node.parent.path,
                        );
                        const fileEntry = fileInfo.find(
                            (f) => f.name === node.name,
                        );
                        if (fileEntry && fileEntry.size < node.data.file.size) {
                            startOffset = fileEntry.size;
                            console.log(
                                `Resuming upload of ${node.name} at offset ${startOffset}`,
                            );
                        }
                    }

                    // Start a progress bar.
                    node.progress(startOffset || 0, node.data.file.size);

                    const uploadId = await connection.startChunkedUpload(
                        path,
                        node.data.file.size,
                        startOffset,
                    );

                    let chunkSize = DEFAULT_CHUNK_SIZE;
                    let offset = startOffset !== null ? startOffset : 0;
                    while (offset < node.data.file.size) {
                        if (node.paused()) {
                            // If paused (or cancelled), stop uploading chunks.
                            // Since partial was set to true, we can resume later.
                            // Ensure the status is set to pending so that it can be resumed later.
                            console.log("Upload paused, stopping upload.");
                            await connection.stopChunkedUpload(uploadId);
                            return node.pauseToResume();
                        }
                        const start = offset;
                        const end = Math.min(
                            start + chunkSize,
                            node.data.file.size,
                        );
                        const chunk = node.data.file.slice(start, end);
                        // console.log(`Uploading chunk with bytes ${start} to ${end}.`);
                        const startTime = performance.now();
                        const response = await connection.uploadChunk(
                            uploadId,
                            chunk,
                            start,
                            end,
                        );
                        const status = response.status;
                        offset += chunk.size;
                        if (status !== "success" && status !== "end") {
                            console.log("Status: " + status);
                            if (status === "error") {
                                throw new Error(response.error);
                            }
                            throw new Error(
                                `Chunk failed to upload. status: ${status}`,
                            );
                        }

                        // Once at least one chunk has been uploaded,
                        // mark as partial so that we can resume later
                        // if it fails or is paused.
                        node.data.partial = true;

                        // Progress bar
                        node.progress(end, node.data.file.size);

                        // Adjust chunk size if applicable
                        const endTime = performance.now();
                        const ms = endTime - startTime;
                        const chunkSizeIndex = CHUNK_SIZES.indexOf(chunkSize);
                        if (
                            chunkSizeIndex > 0 &&
                            ms > DECREASE_CHUNK_SIZE_THRESHOLD
                        ) {
                            // The chunk size can become smaller, and the decrease threshold was reached.
                            chunkSize = CHUNK_SIZES[chunkSizeIndex - 1];
                            console.log(
                                `Chunk took ${Math.round(ms)} ms, decreasing chunk size.`,
                            );
                        } else if (
                            chunkSizeIndex < CHUNK_SIZES.length - 1 &&
                            ms < INCREASE_CHUNK_SIZE_THRESHOLD
                        ) {
                            // The chunk size can become bigger, and the increase threshold was reached.
                            chunkSize = CHUNK_SIZES[chunkSizeIndex + 1];
                            console.log(
                                `Chunk took ${Math.round(ms)} ms, increasing chunk size.`,
                            );
                        } else {
                            // console.log(`Chunk took ${Math.round(ms)} ms, chunk size is good.`);
                        }
                    }

                    const list = await connection.list(node.parent.path);
                    const fileInfo = list.find((f) => f.name === node.name);

                    // These errors will trigger a retry if possible.
                    if (!fileInfo) {
                        throw new Error(
                            "Chunked upload failed for an unknown reason. File did not exist after upload.",
                        );
                    } else if (fileInfo.size !== node.data.file.size) {
                        throw new Error(
                            "Chunked upload failed. The file only uploaded partially.",
                        );
                    }
                    // else, all good!
                },
                cancelled: async (fileTree, connection) => {
                    // If the task is cancelled, we need to delete all files that were partially
                    // uploaded to avoid leaving behind corrupted files.
                    let folderCache = useSession
                        .getState()
                        .getSession().folderCache;
                    async function removePartialFilesRecursive(
                        fileTree: FileTree<UploadData>,
                    ) {
                        for (const entry of fileTree.getEntries()) {
                            if (entry instanceof FileTreeFile) {
                                if (entry.data.partial) {
                                    const path = joinPath(
                                        fileTree.path,
                                        entry.name,
                                    );
                                    console.log(
                                        `Removing partial file ${path}`,
                                    );
                                    await connection.delete(path);
                                    folderCache.remove(dirname(path));
                                }
                            } else {
                                await removePartialFilesRecursive(entry);
                            }
                        }
                    }
                    await removePartialFilesRecursive(fileTree);
                    const session = useSession.getState().getSession();
                    session.folderCache.fetchIfNotCached(
                        session,
                        usePath.getState().path,
                    );
                },
            },
        ),
    );
}
