import * as React from "react";
import { afterEach, beforeEach, vi, expect, it, afterAll } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getApp, App, DeviceSize } from "../ui/App";
import FTPSession from "../ftp/FTPSession";
import FTPProfile from "../ftp/FTPProfile";
import TestFTPConnection from "./TestFTPConnection";
import FolderEntry, { FolderEntryType } from "../folder/FolderEntry";
import * as downloadModule from "../download";
import FolderContentProviders from "../folder/FolderContentProviders";
import Priority from "../ftp/Priority";
import JSZip from "jszip";
import TaskManager from "../task/TaskManager";

const TEST_FILE_CONTENT = "Test content";
const TEST_FILE_BLOB = new Blob([TEST_FILE_CONTENT], { type: "text/plain" });
const TEST_FILE = new FolderEntry("/test.txt", "test.txt", TEST_FILE_BLOB.size, FolderEntryType.File, "");

const TEST_FOLDER = new FolderEntry("/test_folder", "test_folder", 1, FolderEntryType.Directory, "");

const SUB_FILE_1_CONTENT = "Test content 1";
const SUB_FILE_1_BLOB = new Blob([SUB_FILE_1_CONTENT], { type: "text/plain" });
const SUB_FILE_1 = new FolderEntry("/test_folder/test1.txt", "test1.txt", SUB_FILE_1_BLOB.size, FolderEntryType.File, "");

const SUB_FILE_2_CONTENT = "Test content 2";
const SUB_FILE_2_BLOB = new Blob([SUB_FILE_2_CONTENT], { type: "text/plain" });
const SUB_FILE_2 = new FolderEntry("/test_folder/test2.txt", "test2.txt", SUB_FILE_2_BLOB.size, FolderEntryType.File, "");

const TEST_FOLDER_LIST_IMPL = async (path: string) => {
    if (path === "/") return [TEST_FOLDER];
    if (path === TEST_FOLDER.path) return [SUB_FILE_1, SUB_FILE_2];
    return [];
};

const downloadFileSpy = vi.spyOn(downloadModule, "default").mockImplementation(() => { });

describe("ftp-client tests", () => {
    let session: FTPSession;
    let connection: TestFTPConnection;

    beforeEach(async () => {
        const profile = new FTPProfile("", 21, "", "", false);
        session = profile.startSession();
        connection = new TestFTPConnection();
        session.setConnection(connection);

        window.innerWidth = 1024;
    });

    afterEach(async () => {
        // Ensure pending requests are cleared
        if (getApp().state.session) {
            await FolderContentProviders.MAIN.getFolderEntries(Priority.QUICK, "/");
        }
        if (TaskManager.hasTask()) {
            console.warn("A task is still running. Cancelling it.");
            TaskManager.getTask().complete();
        }
        cleanup();
    });

    describe("experimentation", () => {
        let wind;
        let arrbuf;

        it("set wind", () => {
            render(<App />);
            wind = window;
            arrbuf = new Uint8Array().buffer.constructor;
        });

        it("are they equal?", () => {
            render(<App />);
            const a = new Uint8Array().buffer.constructor;
            console.log(a === arrbuf);
        });
    });

    it("connect form is rendered", async () => {
        render(<App />);
        expect(screen.getByText(/Log in to the ftp server/)).toBeInTheDocument();
    });

    it("list", async () => {
        connection.list.mockResolvedValueOnce([TEST_FILE]);
        render(<App session={session} />);

        expect(await screen.findByText(TEST_FILE.name)).toBeInTheDocument();
    });

    it("mobile view is rendered", async () => {
        connection.list.mockResolvedValueOnce([TEST_FILE]);
        window.innerWidth = 360;
        render(<App session={session} />);
        expect(getApp().state.size).equal(DeviceSize.MOBILE);
        expect(await screen.findByText(TEST_FILE.name)).toBeInTheDocument();
    });

    it("mkdir", async () => {
        render(<App session={session} />);

        userEvent.click(screen.getByRole("button", { name: "New Folder" }));
        await userEvent.type(await findPromptInput("Enter the name of the new folder"), "test_mkdir_folder");
        connection.list.mockResolvedValueOnce([
            new FolderEntry("/test_mkdir_folder", "test_mkdir_folder", 1, FolderEntryType.Directory, "")
        ]);
        await userEvent.click(screen.getByRole("button", { name: "OK" }));

        expect(connection.mkdir).toHaveBeenCalledWith("/test_mkdir_folder");

        expect(await screen.findByText("test_mkdir_folder")).toBeInTheDocument();
    });

    describe("download", async () => {

        it("download file via button", async () => {
            connection.list.mockResolvedValueOnce([TEST_FILE]);
            connection.download.mockResolvedValueOnce(TEST_FILE_BLOB);
            render(<App session={session} />);

            await userEvent.click(await screen.findByText(TEST_FILE.name));
            await userEvent.click(await screen.findByRole("button", { name: "Download" }));

            expect(connection.download).toHaveBeenCalledWith(TEST_FILE.path);
            expect(downloadFileSpy).toHaveBeenCalledWith(TEST_FILE_BLOB, TEST_FILE.name);
        });

        it("download file via context menu", async () => {
            connection.list.mockResolvedValueOnce([TEST_FILE]);
            connection.download.mockResolvedValueOnce(TEST_FILE_BLOB);
            render(<App session={session} />);

            fireEvent.contextMenu(await screen.findByText(TEST_FILE.name));
            await userEvent.click(await findContextMenuEntry("Download"));

            expect(connection.download).toHaveBeenCalledWith(TEST_FILE.path);
            expect(downloadFileSpy).toHaveBeenCalledWith(TEST_FILE_BLOB, TEST_FILE.name);
        });

        it("download folder as zip", async () => {
            connection.list.mockImplementation(TEST_FOLDER_LIST_IMPL);
            let downloadedBlob: Blob;
            let downloadedName: string;
            downloadFileSpy.mockImplementationOnce((blob: Blob, name: string) => {
                downloadedBlob = blob;
                downloadedName = name;
            });
            render(<App session={session} />);

            // globalThis.ArrayBuffer = new Uint8Array().buffer.constructor;

            await userEvent.click(await findFolderEntry(TEST_FOLDER.name));
            await userEvent.click(await screen.findByRole("button", { name: "Download" }));

            await waitFor(() => {
                expect(TaskManager.hasTask()).toBe(false);
            });

            expect(downloadedName).toBe(TEST_FOLDER.name + ".zip");
            expect(downloadedBlob).not.toBeUndefined();

            const zip = await JSZip.loadAsync(downloadedBlob);
            const file1 = zip.file(SUB_FILE_1.path.substring(1));
            const file2 = zip.file(SUB_FILE_2.path.substring(1));
            expect(file1).not.toBeNull();
            expect(file2).not.toBeNull();
            expect(await file1.async("text")).toBe(SUB_FILE_1_CONTENT);
            expect(await file2.async("text")).toBe(SUB_FILE_2_CONTENT);
        });

    });

    describe("delete", async () => {

        it("delete file via button", async () => {
            connection.list.mockResolvedValueOnce([TEST_FILE]);
            render(<App session={session} />);

            await userEvent.click(await screen.findByText(TEST_FILE.name));
            await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

            expect(connection.delete).toHaveBeenCalledWith(TEST_FILE.path);
        });

        it("delete file via context menu", async () => {
            connection.list.mockResolvedValueOnce([TEST_FILE]);
            render(<App session={session} />);

            fireEvent.contextMenu(await screen.findByText(TEST_FILE.name));
            await userEvent.click(await findContextMenuEntry("Delete"));

            expect(connection.delete).toHaveBeenCalledWith(TEST_FILE.path);
        });

    });

    describe("rename", async () => {

        async function renameTest(activator: () => Promise<void>) {
            connection.list.mockResolvedValueOnce([TEST_FILE]);
            render(<App session={session} />);

            await activator();

            const promptInput = await findPromptInput("Enter the new name of the file");
            await userEvent.clear(promptInput);
            await userEvent.type(promptInput, "test_renamed.txt");
            connection.list.mockResolvedValueOnce([
                new FolderEntry("/test_renamed.txt", "test_renamed.txt", 1, FolderEntryType.File, "")
            ]);
            const confirmButton = (await screen.findAllByRole("button", { name: "Rename" })).find(e => e.classList.contains("btn-primary"));
            expect(confirmButton).toBeInTheDocument();
            await userEvent.click(confirmButton);

            expect(connection.rename).toHaveBeenCalledWith("/test.txt", "/test_renamed.txt");
        }

        it("rename file via button", async () => {
            await renameTest(async () => {
                await userEvent.click(await screen.findByText(TEST_FILE.name));
                await userEvent.click(await screen.findByRole("button", { name: "Rename" }));
            });
        });

        it("rename file via context menu", async () => {
            await renameTest(async () => {
                fireEvent.contextMenu(await screen.findByText(TEST_FILE.name));
                await userEvent.click(await findContextMenuEntry("Rename"));
            });
        });
    });

    describe("navigate", async () => {
        async function naviateToSubfolderTest(activator: () => Promise<void>) {
            connection.list.mockImplementation(TEST_FOLDER_LIST_IMPL);
            render(<App session={session} />);
            await activator();
            expect(screen.getByRole("textbox", { name: "Current folder path" })).toHaveValue(TEST_FOLDER.path);
            expect(await screen.findByText(SUB_FILE_1.name)).toBeInTheDocument();
            expect(await screen.findByText(SUB_FILE_2.name)).toBeInTheDocument();
        }

        it("naviate to subfolder via double click", async () => {
            await naviateToSubfolderTest(async () => {
                const folderEntry = (await screen.findAllByText(TEST_FOLDER.name)).find(e => e.parentElement.classList.contains("folder-entry"));
                expect(folderEntry).toBeInTheDocument();
                await userEvent.dblClick(folderEntry);
            });
        });

        it("naviate to subfolder via button", async () => {
            await naviateToSubfolderTest(async () => {
                const folderEntry = (await screen.findAllByText(TEST_FOLDER.name)).find(e => e.parentElement.classList.contains("folder-entry"));
                expect(folderEntry).toBeInTheDocument();
                fireEvent.contextMenu(folderEntry);
                await userEvent.click(await findContextMenuEntry("Open"));
            });
        });

        it("navigate to subfolder via folder explorer", async () => {
            await naviateToSubfolderTest(async () => {
                const folderEntry = (await screen.findAllByText(TEST_FOLDER.name)).find(e => !e.parentElement.classList.contains("folder-entry"));
                expect(folderEntry).toBeInTheDocument();
                await userEvent.click(folderEntry);
            });
        });
    });

    it("mobile tabs", async () => {
        connection.list.mockResolvedValueOnce([TEST_FILE]);
        window.innerWidth = 360;
        render(<App session={session} />);

        expect(await screen.findByText(TEST_FILE.name)).toBeInTheDocument();
        // Default tab
        expect(screen.getByRole("button", { name: "Current folder path" })).toBeVisible();

        await userEvent.click(screen.getByRole("button", { name: "Selection information and actions" }));
        expect(screen.getByRole("button", { name: "New Folder" })).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Folder explorer" }));
        expect(screen.getByText("/")).toBeInTheDocument();
    });

    it("compute size", async () => {
        connection.list.mockImplementation(TEST_FOLDER_LIST_IMPL);
        render(<App session={session} />);
        const folderEntry = await findFolderEntry(TEST_FOLDER.name);
        await userEvent.click(folderEntry);
        await userEvent.click(await screen.findByRole("button", { name: "Compute size" }));
        const size = SUB_FILE_1.size + SUB_FILE_2.size;
        expect((await screen.findByText(/Size:/)).textContent).toBe("Size: " + size + " B");
    });
});

async function findFolderEntry(name: string) {
    const folderEntry = (await screen.findAllByText(TEST_FOLDER.name)).find(e => e.parentElement.classList.contains("folder-entry"));
    expect(folderEntry).toBeInTheDocument();
    return folderEntry;
}

async function findContextMenuEntry(text: string) {
    const element = (await screen.findAllByText(text)).find(el => el.tagName === "LI");
    expect(element).toBeInTheDocument();
    return element;
}

async function findPromptInput(text: string) {
    const element = await screen.findByText(text);
    const input = element.nextElementSibling;
    expect(input).toBeInTheDocument();
    return input;
}