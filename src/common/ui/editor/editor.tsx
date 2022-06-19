import * as React from "react";
import * as ReactDOM from "react-dom";
import Dialog from "../../Dialog";
import FolderEntry from "../../folder/FolderEntry";
import { readNbt, writeNbt } from "../../nbt/nbt";
import NbtData, { BedrockEdition, BedrockLevelDat } from "../../nbt/NbtData";
import { ensurePakoScriptIsLoaded } from "../../utils";
import { FileType, getFileType } from "../FileFormats";
import { app } from "../index";
import { addMessage } from "../messages";
import ImageEditor from "./ImageEditor";
import NbtEditor from "./nbt/NbtEditor";
import TextEditorControls from "./TextEditorControls";

// @ts-ignore
window.editorWindows = [];

/**
 * Create a window where an editor can be contained.
 *
 * @param name The name of the window. A window being created with an existing
 * name will replace the old window.
 * @param url The url to open.
 * @returns The window object of the created window.
 */
function openWindow(name: string, url = "about:blank"): Window {
    let wind = window.open(url, name, "width=600,height=600");
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
        };
    }
    // @ts-ignore
    window.editorWindows.push(wind);
    return wind;
}

/**
 * Open the entry with the right editor. If none is detected, ask the user how to
 * open the file.
 * 
 * @param folderEntry The folder entry to open.
 */
export async function openEditor(folderEntry: FolderEntry) {
    let fileType = getFileType(folderEntry.name);

    if (fileType == "unknown") {
        const option = await Dialog.choose("Open " + folderEntry.name, "How would you like to open the file?", [
            { id: "text", name: "Open as text" },
            { id: "image", name: "Open as image" },
            { id: "nbt", name: "Open as Minecraft NBT" }
        ]);
        fileType = option as FileType;
    }

    if (fileType == "text") {
        openTextEditor(folderEntry);
    } else if (fileType == "image") {
        openImageEditor(folderEntry);
    } else if (fileType == "nbt") {
        openNbtEditor(folderEntry);
    }
}

/**
 * Open a text editor to view and edit a text file.
 *
 * @param folderEntry The folder entry to edit as text.
 */
export async function openTextEditor(folderEntry: FolderEntry) {
    const fileInfo = await getFile(folderEntry);
    if (fileInfo == null) return;
    const wind = openWindow(folderEntry.name, "text-editor.html");

    const textPromise = new Promise<string>(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () {
            resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsText(fileInfo.blob);
    });
    const absolutePath = app.state.session.workdir + (app.state.session.workdir.endsWith("/") ? "" : "/") + folderEntry.name;

    wind["editorLoaded"] = async function() {
        const text = await textPromise;
        // @ts-ignore
        const uri = wind.monaco.Uri.file(absolutePath);
        // @ts-ignore
        const model = wind.monaco.editor.createModel(
            text,
            null, // auto detect language from uri (file extention)
            uri
        );
        // @ts-ignore
        wind.editor.setModel(model);

        wind.document.title = "Editing " + folderEntry.name + (fileInfo.isGZipped ? " (gzipped)" : "");

        ReactDOM.render(<TextEditorControls window={wind} allowSaving={fileInfo.allowSaving} />, wind.document.getElementById("controls"));
    };

    wind["save"] = async function() {
        // @ts-ignore
        const text: string = wind.editor.getValue();
        const connection = await app.state.session.getConnection();

        const blob = new Blob([text]);
        await connection.upload(blob, absolutePath);

        // @ts-ignore
        wind.saveFinished();
    };
}

/**
 * Open the image editor for viewing an image.
 *
 * @param folderEntry The folder entry to view as an image.
 */
export async function openImageEditor(folderEntry: FolderEntry) {
    const blob = await getFile(folderEntry);
    if (blob == null) return;
    const wind = openWindow(folderEntry.name);
    await waitForPageLoad(wind);
    const url = URL.createObjectURL(blob.blob);

    wind.document.title = "Viewing " + folderEntry.name;
    ReactDOM.render(<ImageEditor url={url} window={wind} />, wind.document.body);
}

/**
 * Open the NBT editor for viewing and editing nbt.
 * 
 * @param folderEntry The folder entry to open as nbt.
 */
export async function openNbtEditor(folderEntry: FolderEntry) {
    const fileInfo = await getFile(folderEntry);
    if (fileInfo == null) return;
    let nbt: NbtData;
    try {
        nbt = await readNbt(fileInfo.blob);
    } catch(e) {
        Dialog.message(
            "Error reading NBT",
            "There was an error reading the NBT file. Are you sure it is an NBT file? " + e
        );
        return;
    }
    
    // We are very strict on which nbt files we allow being edited. Nbt editing is
    // experimental and we therefore only allow saving for some specific files that
    // we know work.
    let allowSaving = true;
    if (nbt.compression != "none") {
        allowSaving = false;
    }
    if (nbt.editionData.edition == "bedrock"
        && (nbt.editionData as BedrockEdition).isLevelDat
        && (nbt.editionData as BedrockLevelDat).headerVersion != 9) {
            allowSaving = false;
    }

    const wind = openWindow(folderEntry.name);
    const css = await (await fetch("nbt-editor.css")).text();
    await waitForPageLoad(wind);
    const style = wind.document.createElement("style");
    style.innerHTML = css;
    wind.document.head.appendChild(style);

    if (allowSaving) {
        const absolutePath = app.state.session.workdir + (app.state.session.workdir.endsWith("/") ? "" : "/") + "ftp-client_nbt_" + folderEntry.name;
        wind["save"] = async function() {
            // @ts-ignore
            const connection = await app.state.session.getConnection();
    
            const blob = await writeNbt(nbt);
            await connection.upload(blob, absolutePath);
    
            // @ts-ignore
            wind.saveFinished();
        };
    }

    wind.document.title = "Editing " + folderEntry.name;
    ReactDOM.render(<NbtEditor window={wind} nbt={nbt} allowSaving={false} />, wind.document.body);
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

    const connection = await app.state.session.getConnection();
    let blob = await connection.download(folderEntry.name);
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
function confirmOpenGzip(folderEntry: FolderEntry): Promise<boolean> {
    return Dialog.confirm("Open gzipped file?", "The file " + folderEntry.name + " is gzipped, do you want to view it ungzipped? The file will not be changed on the server.");
}

/**
 * Ungzip the file.
 * 
 * @param blob The gzipped input blob.
 * @returns The ungizpped output blob.
 */
async function ungzip(blob: Blob): Promise<Blob> {
    await ensurePakoScriptIsLoaded();

    const input = await blob.arrayBuffer();
    // @ts-ignore
    const output: Uint8Array = await pako.ungzip(input);
    return new Blob([output]);
}