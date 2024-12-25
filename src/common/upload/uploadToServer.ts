import Dialog from "../Dialog";
import FolderContentProviders from "../folder/FolderContentProviders";
import FolderEntry from "../folder/FolderEntry";
import DirectoryPath from "../ftp/DirectoryPath";
import Priority from "../ftp/Priority";
import Task from "../task/Task";
import TaskManager from "../task/TaskManager";
import { getApp } from "../ui/App";
import { largeFileOperationStore } from "../ui/LargeFileOperation";
import { dirname, filename, joinPath, sleep } from "../utils";
import Directory from "./Directory";

const LARGE_FILE_THRESHOLD = 10E6; // 10 MB

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
export async function upload(uploads: Directory) {
    if (!TaskManager.requestNewTask()) return;

    // Count the files for the task progress
    const hasDirectories = Object.keys(uploads.directories).length > 0;
    const totalCount = countFilesRecursively(uploads);

    const taskName = !hasDirectories && totalCount === 1
        ? "Uploading " + uploads.files[0].name
        : "Uploading " + totalCount + " files";

    const hasProgressBar = totalCount > 1;
    const task = new Task(taskName, "", hasProgressBar);
    TaskManager.setTask(task);

    // Do the uploading
    const path = new DirectoryPath(getApp().state.workdir);
    try {
        await uploadDirectory(uploads, task, path, 0, totalCount);

        // Refresh the current directory and clear cache
        getApp().refresh(true);
    
        // Complete the task
        task.complete();
    } catch (e) {
        Dialog.message(
            "Upload failed",
            `The upload failed even after several attempts. Error: ${e}`
        );

        // While we didn't "complete" the task, we mark it as complete to avoid being completely stuck.
        task.complete();
    }
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
        // This will try 5 times for each file. For large files this will also
        // validate by checking the file size after upload. This does not
        // happen for small files though. If uploadFile errors, that means
        // that the file couldn't be uploaded even after 5 attempts. In this
        // case, we want to propagate the error and fail the entire upload.
        //
        task.progress(uploadCount, totalCount, "Uploading " + file.name);
        const filePath = joinPath(path.get(), file.name);
        await uploadFile(file, filePath);
        uploadCount++;
    }
    // List the current folder to double check that files were uploaded correctly
    // and so that we can see if the following subdirectories exist
    const list = await FolderContentProviders.FTP.getFolderEntries(Priority.LARGE_TASK, path.get());

    // Since small files were not double checked, we do that now and upload them
    // again if they failed.
    let attempt = 0;
    while (attempt < 5) {
        let allGood = true;
        for (const file of directory.files) {
            const fileInfo = list.find(f => f.name === file.name);
            if (fileInfo && fileInfo.size === file.size) {
                continue;
            }
            allGood = false;
            attempt++;
            const filePath = joinPath(path.get(), file.name);
            console.log(`File ${filePath} was not uploaded properly. Expected size ${file.size} but found ${fileInfo.size}`);
            task.progress(uploadCount, totalCount, `Uploading ${file.name} (attempt ${attempt})`);
            await uploadFile(file, filePath);
            // Don't increment uploadCount again.
        }
        if (allGood) {
            break;
        }
    }

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
            await getApp().state.session.mkdir(Priority.LARGE_TASK, joinPath(path.get(), subdirName));
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

async function uploadFile(file: File, path: string) {
    if (file.size <= LARGE_FILE_THRESHOLD) {
        await uploadSmallFile(file, path);
    } else {
        await uploadLargeFile(file, path);
    }
}

async function uploadSmallFile(file: File, path: string) {
    let attempt = 0;
    let lastError: any = null;
    let success = false;
    while (attempt < 5) {
        try {
            // Since this is performed on the session, it may have to wait in the queue for
            // Quick operations. It will also ensure that the connection is valid before
            // performing the upload, and reconnect if necessary.
            await getApp().state.session.uploadSmall(Priority.LARGE_TASK, file, path);
            success = true;
            break;
        } catch (e) {
            attempt++;
            console.log(`Attempt ${attempt} got error:`, e);
            lastError = e;
            await sleep(1000);
        }
    }
    if (!success) {
        console.error(`Failed to upload after ${attempt} attempts. lastError =`, lastError);
        throw lastError || new Error(`Failed to upload after ${attempt} attempts.`);
    }
}

async function uploadLargeFile(file: File, path: string) {
    let attempt = 0;
    let lastError: any = null;
    let success = false;
    let startOffset: number | null = null;
    while (attempt < 5) {
        // Since chunked uploads requires sending multiple packets we must lock
        // the request queue to stop any other requests with higher priority from
        // being executed while uploading.
        const queueLockIdentifier = 'chunked-upload-' + String(Math.random()).substring(2);
        try {
            await getApp().state.session.requestQueueLock(Priority.LARGE_TASK, queueLockIdentifier);
            await uploadLargeFile0(file, path, startOffset, queueLockIdentifier);
            success = true;
            break;
        } catch (e) {
            attempt++;
            console.log(`Attempt ${attempt} got error:`, e);
            lastError = e;
            getApp().state.session.unlockQueue(queueLockIdentifier);

            // Disconnect to ensure upload is fully aborted.
            // Also wait a bit just to be safe.
            getApp().state.session.disconnect();
            await sleep(1000);

            // Restart partial upload.
            const fileInfo = await getFileInfo(path);
            startOffset = fileInfo && fileInfo.size < file.size ? fileInfo.size : null;
        } finally {
            getApp().state.session.unlockQueue(queueLockIdentifier);
        }
    }
    if (!success) {
        console.error(`Failed to upload after ${attempt} attempts. lastError =`, lastError);

        // If the file has been partially uploaded we need to warn the user.
        const fileInfo = await getFileInfo(path);
        if (fileInfo.size !== file.size) {
            await (new Promise<void>(resolve => {
                Dialog.message(
                    "Partial upload failed",
                    `The file at ${path} failed to upload properly, even after ${attempt} attempts, and it might have
                    corrupted due to only part of the file being uploaded correctly. Only ${Math.round(fileInfo.size / 1E6)}
                    MB out of ${Math.round(file.size / 1E6)} MB were actually uploaded. Please delete ${path} and try to
                    upload it again. Last error: ${lastError}`,
                    () => resolve()
                );
            }));
        }
        throw lastError || new Error(`Failed to upload after ${attempt} attempts.`);
    }
}

async function uploadLargeFile0(file: File, path: string, startOffset: number | null, queueLockIdentifier: string) {
    const uploadId = await getApp().state.session.startChunkedUpload(Priority.LARGE_TASK, queueLockIdentifier, path, file.size, startOffset);

    let chunkSize = DEFAULT_CHUNK_SIZE;

    let lastStatus = "";
    let offset = startOffset !== null ? startOffset : 0;
    while (offset < file.size) {
        const start = offset;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        console.log(`Uploading chunk with bytes ${start} to ${end}.`);
        const startTime = performance.now();
        const response = await getApp().state.session.uploadChunk(
            Priority.LARGE_TASK,
            queueLockIdentifier,
            uploadId,
            chunk,
            start,
            end
        );
        const status = response.status;
        offset += chunk.size;
        lastStatus = status;
        if (status !== "success" && status !== "end") {
            console.log("Status: " + status);
            if (status === "error") {
                throw new Error(response.error);
            }
            throw new Error(`Chunk failed to upload. status: ${status}`);
        }

        // Progress bar
        largeFileOperationStore.setValue({
            type: "upload",
            fileName: filename(path),
            hasProgress: true,
            loaded: end,
            total: file.size
        });

        // Adjust chunk size if applicable
        const endTime = performance.now();
        const ms = endTime - startTime;
        const chunkSizeIndex = CHUNK_SIZES.indexOf(chunkSize);
        if (chunkSizeIndex > 0 && ms > DECREASE_CHUNK_SIZE_THRESHOLD) {
            // The chunk size can become smaller, and the decrease threshold was reached.
            chunkSize = CHUNK_SIZES[chunkSizeIndex - 1];
            console.log(`Chunk took ${Math.round(ms)} ms, decreasing chunk size.`);
        } else if (chunkSizeIndex < CHUNK_SIZES.length - 1 && ms < INCREASE_CHUNK_SIZE_THRESHOLD) {
            // The chunk size can become bigger, and the increase threshold was reached.
            chunkSize = CHUNK_SIZES[chunkSizeIndex + 1];
            console.log(`Chunk took ${Math.round(ms)} ms, increasing chunk size.`);
        } else {
            console.log(`Chunk took ${Math.round(ms)} ms, chunk size is good.`);
        }
    }

    // Unlock the queue to allow the following list request
    getApp().state.session.unlockQueue(queueLockIdentifier);

    const fileInfo = await getFileInfo(path);
    largeFileOperationStore.setValue(null);

    // These errors will trigger a retry if possible.
    if (!fileInfo) {
        throw new Error("Chunked upload failed for an unknown reason. File did not exist after upload.");
    } else if (fileInfo.size !== file.size) {
        throw new Error("Chunked upload failed. The file only uploaded partially.");
    }
    // else, all good!
}

async function getFileInfo(path: string): Promise<FolderEntry | null> {
    const listResult = await getApp().state.session.list(Priority.LARGE_TASK, dirname(path));
    const fileName = filename(path);
    return listResult.find(f => f.name === fileName) || null;
}