import { ungzip as pakoUngzip } from "pako";
import Dialog from "../../Dialog";
import FolderEntry from "../../folder/FolderEntry";
import Priority from "../../ftp/Priority";
import { readNbt, validateNbtParsing } from "../../nbt/nbt";
import NbtData from "../../nbt/NbtData";
import { FileType, getFileType } from "../FileFormats";
import { getApp } from "../App";
import { addMessage } from "../messages";
import { EventEmitter } from "eventemitter3";
import { CancellationError, formatError } from "../../error";
import { sha256 } from "../../utils";
import { useNewUiStore } from "../../ui2/store/newUiStore";
import { performWithRetry } from "../../task/taskActions";
import { useSession } from "../../ui2/store/sessionStore";

interface EditorWindow {
    window: Window;
    folderEntry: FolderEntry;
}

class EditorWindowsStore extends EventEmitter {
    editorWindows: EditorWindow[] = [];

    setEditorWindows(editorWindows: EditorWindow[]) {
        this.editorWindows = editorWindows;
        this.emit("change", this.editorWindows);
    }

    addEditorWindow(editorWindow: EditorWindow) {
        this.setEditorWindows([...this.editorWindows, editorWindow]);
    }

    removeUnloaded() {
        const current = this.editorWindows;
        const openWindows = current.filter(wind => !wind.window.closed);
        if (openWindows.length !== current.length) {
            this.setEditorWindows(openWindows);
        }
    }
}
export const editorWindowsStore = new EditorWindowsStore();

window.addEventListener("beforeunload", (event) => {
    if (editorWindowsStore.editorWindows.filter(wind => !wind.window.closed).length > 0) {
        event.preventDefault();
        return (event.returnValue = "");
    }
});

window.addEventListener("unload", () => {
    editorWindowsStore.editorWindows.forEach(wind => wind.window.close());
});

window.addEventListener("focus", () => {
    editorWindowsStore.removeUnloaded();
});

/**
 * Create a window where an editor can be contained.
 *
 * @param name The name of the window. A window being created with an existing
 * name will replace the old window.
 * @param url The url to open.
 * @param folderEntry The folder entry that is being edited.
 * @returns The window object of the created window.
 */
function openWindow(name: string, url: string, folderEntry: FolderEntry): Window {
    let wind: Window = null;
    if (window.innerWidth > 768) {
        // Try open popup window on desktop
        try {
            wind = window.open(url, name, "width=600,height=600");
        } catch (err) {
            // Ignore error. Popup blockers may remove the window.open function or in other
            // ways block it. We have to use an iframe instead so let wind be null.
        }
        if (wind) {
            // Add to list of open popup windows
            editorWindowsStore.addEditorWindow({
                window: wind,
                folderEntry
            });
        }
    }
    // If the popup failed to open, open an iframe instead.
    if (wind == null) {
        const existingFrame = document.getElementById("editor-iframe");
        if (existingFrame != null) {
            existingFrame.remove();
            addMessage({
                color: "danger",
                message: "Closing existing window",
                stayForMillis: 10000
            });
        }
        const iframe = document.createElement("iframe");
        iframe.addEventListener("load", function() {
            console.log("iframe loaded");
        });
        iframe.id = "editor-iframe";
        iframe.src = url;
        document.body.appendChild(iframe);
        wind = iframe.contentWindow;
        wind["doClose"] = function() {
            iframe.remove();
            editorWindowsStore.removeUnloaded();
        };
    }
    wind.addEventListener("unload", () => {
        setTimeout(() => {
            editorWindowsStore.removeUnloaded();
        }, 100);
    });
    return wind;
}

function openExistingWindow(folderEntry: FolderEntry): boolean {
    const wind = editorWindowsStore.editorWindows.find(wind => wind.folderEntry.path == folderEntry.path);
    if (wind) {
        wind.window.focus();
        return true;
    }
    return false;
}

async function chooseEditor(folderEntry: FolderEntry): Promise<FileType | null> {
    const option = await Dialog.choose("Open " + folderEntry.name, "How would you like to open the file?", [
        { id: "text", name: "Open as text" },
        { id: "image", name: "Open as image" },
        { id: "nbt", name: "Open as Minecraft NBT" },
        { id: "log", name: "Open as log file" },
    ]);
    return option as FileType;
}

/**
 * Open the entry with the right editor. If none is detected, ask the user how to
 * open the file.
 * <p>
 * If the {@code fileType} is not specified, a file type will be auto detected, and
 * if no file type could be detected the user will be prompted.
 * 
 * @param folderEntry The folder entry to open.
 * @param fileType The file type that determins which editor to open.
 */
export async function openEditor(folderEntry: FolderEntry, fileType?: FileType) {
    if (!fileType) {
        fileType = getFileType(folderEntry.name);
    
        if (fileType == "unknown") {
            fileType = await chooseEditor(folderEntry);
        }
    }

    if (fileType == "text") {
        await openTextEditor(folderEntry);
    } else if (fileType == "image") {
        await openImageEditor(folderEntry);
    } else if (fileType == "nbt") {
        await openNbtEditor(folderEntry);
    } else if (fileType == "log") {
        await openLogEditor(folderEntry);
    }
}

export async function openChosenEditor(folderEntry: FolderEntry) {
    const fileType = await chooseEditor(folderEntry);
    await openEditor(folderEntry, fileType);
}

export async function openTextEditor(folderEntry: FolderEntry) {
    if (openExistingWindow(folderEntry)) return;

    const fileInfo = await getFile(folderEntry);
    if (fileInfo == null) return;
    if (!(fileInfo.blob instanceof Blob)) {
        Dialog.message("Failed to read file.", "Reading the file produced: " + fileInfo.blob);
        throw new Error("Failed to read file, got non-blob type: " + fileInfo.blob);
    }

    let textEditor = "monaco";
    if (window.innerWidth < 1000 && "ontouchstart" in document.documentElement) {
        // Small screen and touch, probably a mobile device.
        // Let's switch to codemirror which has better mobile support.
        textEditor = "codemirror";
    }

    const wind = openWindow(folderEntry.name, "editor/text/"+ textEditor +".html", folderEntry);

    const textPromise = new Promise<string>(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () {
            resolve(reader.result as string);
        };
        reader.onerror = function () {
            reject(reader.error ? reader.error : new Error("Failed to read file."));
        };
        reader.readAsText(fileInfo.blob);
    });
    const absolutePath = folderEntry.path;
    const title = "Editing " + folderEntry.name + (fileInfo.isGZipped ? " (gzipped)" : "");
    let beforeHash = await sha256(fileInfo.blob);

    wind["save"] = async (text: string) => {
        const newFileInfo = await getFile(folderEntry);
        const blob = new Blob([text]);
        const contentHash = await sha256(blob);
        if (newFileInfo === null) {
            // TODO when this happens we get another ugly modal warning that the file has been deleted.
            //  see the implementation of getFile. It will also ask for gzip, but that should be irelevant
            //  here since gzipped files cannot be saved.
            try {
                window.focus();
            } catch {}
            const shouldContinue = await Dialog.confirm(
                "File has been deleted",
                "The file you are editing has been deleted since you opened it. Do you want to discard your changes or overwrite the server content?",
                "Discard changes",
                "Overwrite changes on server"
            );
            if (!shouldContinue) {
                // TODO this does NOT work when in an iframe
                try {
                    wind.close();
                } catch {}
                return;
            }
            try {
                wind.focus();
            } catch {}
        } else {
            const afterHash = await sha256(newFileInfo.blob);
            if (beforeHash !== afterHash && afterHash !== contentHash) {
                try {
                    window.focus();
                } catch {}
                const shouldContinue = await Dialog.confirm(
                    "File has changed",
                    "The file has changed since you opened it. Do you want to discard your changes or overwrite the server content?",
                    "Discard changes",
                    "Overwrite changes on server"
                );
                if (!shouldContinue) {
                    try {
                        wind.close();
                    } catch {}
                    return;
                }
                try {
                    wind.focus();
                } catch {}
            }
        }
        if (useNewUiStore.getState().useNewUi) {
            await performWithRetry(useSession.getState().getSession(), absolutePath, async (connection) => {
                await connection.uploadSmall(blob, absolutePath);
            });
        } else {
            await getApp().state.session.uploadSmall(Priority.QUICK, blob, absolutePath);
        }
        // TODO what if the file is large?
        wind.postMessage({
            action: "save-callback"
        });
        // If the file is saved again, we need to use the hash of the new content.
        beforeHash = contentHash;
    };

    wind["textEditorData"] = {
        text: await textPromise,
        absolutePath,
        title,
        allowSaving: fileInfo.allowSaving
    };
}

/**
 * Open the image editor for viewing an image.
 *
 * @param folderEntry The folder entry to view as an image.
 */
export async function openImageEditor(folderEntry: FolderEntry) {
    if (openExistingWindow(folderEntry)) return;

    const blob = await getFile(folderEntry);
    if (blob == null) return;
    const wind = openWindow(folderEntry.name, "editor/image.html", folderEntry);
    const url = URL.createObjectURL(blob.blob);
    wind["imageEditorData"] = {
        url,
        title: "Viewing " + folderEntry.name
    };
}

/**
 * Open the NBT editor for viewing and editing nbt.
 * 
 * @param folderEntry The folder entry to open as nbt.
 */
export async function openNbtEditor(folderEntry: FolderEntry) {
    if (openExistingWindow(folderEntry)) return;

    const fileInfo = await getFile(folderEntry);
    if (fileInfo == null) return;
    let nbt: NbtData;
    try {
        nbt = await readNbt(fileInfo.blob);
    } catch(err) {
        Dialog.message(
            "Error reading NBT",
            "There was an error reading the NBT file. " + formatError(err)
        );
        return;
    }

    const allowSaving = fileInfo.allowSaving && await validateNbtParsing(fileInfo.blob, nbt);

    const wind = openWindow(folderEntry.name, "editor/nbt.html", folderEntry);

    if (allowSaving) {
        const absolutePath = folderEntry.path;
        wind["save"] = async function(blob: Blob) {
            if (useNewUiStore.getState().useNewUi) {
                await performWithRetry(useSession.getState().getSession(), absolutePath, async (connection) => {
                    await connection.uploadSmall(blob, absolutePath);
                });
            } else {
                const session = getApp().state.session;
                await session.uploadSmall(Priority.QUICK, blob, absolutePath);
            }
            wind.postMessage({
                action: "save-callback"
            });
        };
    }

    // We send the blob and let the editor parse the file again.
    // The editor and the main page are in different windows
    // so we can't transfer things between them, they have different
    // nbt classes.
    wind["nbtEditorData"] = {
        blob: fileInfo.blob,
        allowSaving: allowSaving,
        title: "Editing " + folderEntry.name
    };
}

/**
 * Open the log editor for viewing logs.
 *
 * @param folderEntry The folder entry to open.
 */
export async function openLogEditor(folderEntry: FolderEntry) {
    if (openExistingWindow(folderEntry)) return;

    const fileInfo = await getFile(folderEntry);
    if (fileInfo == null) return;
    if (!(fileInfo.blob instanceof Blob)) {
        Dialog.message("Failed to read file.", "Reading the file produced: " + fileInfo.blob);
        throw new Error("Failed to read file, got non-blob type: " + fileInfo.blob);
    }

    const wind = openWindow(folderEntry.name, "editor/log.html", folderEntry);
    
    const textPromise = new Promise<string>(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () {
            resolve(reader.result as string);
        };
        reader.onerror = function () {
            reject(reader.error ? reader.error : new Error("Failed to read file."));
        };
        reader.readAsText(fileInfo.blob);
    });
    const title = "Viewing " + folderEntry.name + (fileInfo.isGZipped ? " (gzipped)" : "");

    wind["logEditorData"] = {
        text: await textPromise,
        title,
    };
}

/**
 * Information about the file that is about to be edited.
 */
interface EditorFileInfo {
    /**
     * The blob to open.
     */
    blob: Blob;
    /**
     * Whether the file may be re-saved. This can be disallowed if the file is gzipped
     * for example.
     */
    allowSaving: boolean;
    /**
     * Whether the file is gzipped.
     */
    isGZipped: boolean;
}

async function waitForPageLoad(wind: Window) {
    if (wind.document.readyState != "complete") {
        // If the document hasn't loaded, wait for it
        await new Promise(function(resolve, reject) {
            wind.addEventListener("load", resolve);
            wind.addEventListener("error", reject);
        });
    }
}

async function getFile(folderEntry: FolderEntry): Promise<EditorFileInfo | null> {
    // If the file is gzipped, ask the user if they want to view it un-gzipped
    const isgzipped = folderEntry.name.endsWith(".gz");
    if (isgzipped && !await confirmOpenGzip(folderEntry)) return null;

    let blob: Blob;
    try {
        if (useNewUiStore.getState().useNewUi) {
            try {
                blob = await performWithRetry(useSession.getState().getSession(), folderEntry.path, async (connection) => {
                    return await connection.download(folderEntry);
                });
            } catch (err) {
                if (err instanceof CancellationError) {
                    return;
                }
                throw err;
            }
        } else {
            blob = await getApp().state.session.download(Priority.QUICK, folderEntry);
        }
    } catch(err) {
        Dialog.message("Failed to open file", formatError(err));
        return null;
    }
    if (isgzipped) {
        blob = await ungzip(blob);
        return {
            blob: blob,
            allowSaving: false,
            isGZipped: true
        };
    }
    return {
        blob: blob,
        allowSaving: true,
        isGZipped: false
    };
}

/**
 * Prompt the user to ask if they want to open the gzipped file.
 *
 * @param folderEntry The file in question.
 * @returns Whether the user wants to open the file.
 */
async function confirmOpenGzip(folderEntry: FolderEntry): Promise<boolean> {
    return await Dialog.confirm("Open gzipped file?", "The file " + folderEntry.name + " is gzipped, do you want to view it ungzipped? The file will not be changed on the server.");
}

/**
 * Ungzip the file.
 * 
 * @param blob The gzipped input blob.
 * @returns The ungizpped output blob.
 */
async function ungzip(blob: Blob): Promise<Blob> {
    const input = await blob.arrayBuffer();
    const output: Uint8Array = pakoUngzip(input);
    return new Blob([output]);
}