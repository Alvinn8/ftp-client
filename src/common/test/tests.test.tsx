import * as React from "react";
import { afterEach, beforeEach, vi, expect, it } from "vitest";
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

vi.spyOn(downloadModule, "default").mockImplementation(() => { });

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
        cleanup();
    });

    it("connect form is rendered", async () => {
        render(<App />);
        expect(screen.getByText(/Log in to the ftp server/)).toBeInTheDocument();
    });

    it("list", async () => {
        connection.list.mockResolvedValueOnce([
            new FolderEntry("/test.txt", "test.txt", 1, FolderEntryType.File, "")
        ]);
        render(<App session={session} />);

        expect(await screen.findByText("test.txt")).toBeInTheDocument();
    });

    it("mobile view is rendered", async () => {
        connection.list.mockResolvedValueOnce([
            new FolderEntry("/test.txt", "test.txt", 1, FolderEntryType.File, "")
        ]);
        window.innerWidth = 360;
        render(<App session={session} />);
        expect(getApp().state.size).equal(DeviceSize.MOBILE);
        expect(await screen.findByText("test.txt")).toBeInTheDocument();
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

    it("download file via button", async () => {
        connection.list.mockResolvedValueOnce([
            new FolderEntry("/test.txt", "test.txt", 1, FolderEntryType.File, "")
        ]);
        render(<App session={session} />);

        await userEvent.click(await screen.findByText("test.txt"));
        await userEvent.click(await screen.findByRole("button", { name: "Download" }));

        expect(connection.download).toHaveBeenCalledWith("/test.txt");
    });

    it("download file via context menu", async () => {
        connection.list.mockResolvedValueOnce([
            new FolderEntry("/test.txt", "test.txt", 1, FolderEntryType.File, "")
        ]);
        render(<App session={session} />);

        fireEvent.contextMenu(await screen.findByText("test.txt"));
        await userEvent.click(await findContextMenuEntry("Download"));

        expect(connection.download).toHaveBeenCalledWith("/test.txt");
    });

    it("delete file via button", async () => {
        connection.list.mockResolvedValueOnce([
            new FolderEntry("/test.txt", "test.txt", 1, FolderEntryType.File, "")
        ]);
        render(<App session={session} />);

        await userEvent.click(await screen.findByText("test.txt"));
        await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

        expect(connection.delete).toHaveBeenCalledWith("/test.txt");
    });

    it("delete file via context menu", async () => {
        connection.list.mockResolvedValueOnce([
            new FolderEntry("/test.txt", "test.txt", 1, FolderEntryType.File, "")
        ]);
        render(<App session={session} />);

        fireEvent.contextMenu(await screen.findByText("test.txt"));
        await userEvent.click(await findContextMenuEntry("Delete"));

        expect(connection.delete).toHaveBeenCalledWith("/test.txt");
    });

    async function renameTest(activator: () => Promise<void>) {
        connection.list.mockResolvedValueOnce([
            new FolderEntry("/test.txt", "test.txt", 1, FolderEntryType.File, "")
        ]);
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
            await userEvent.click(await screen.findByText("test.txt"));
            await userEvent.click(await screen.findByRole("button", { name: "Rename" }));
        });
    });

    it("rename file via context menu", async () => {
        await renameTest(async () => {
            fireEvent.contextMenu(await screen.findByText("test.txt"));
            await userEvent.click(await findContextMenuEntry("Rename"));
        });
    });

    async function naviateToSubfolderTest(activator: () => Promise<void>) {
        connection.list.mockImplementation(async (path: string) => {
            if (path === "/") {
                return [
                    new FolderEntry("/test_folder", "test_folder", 1, FolderEntryType.Directory, "")
                ];
            } else if (path === "/test_folder") {
                return [
                    new FolderEntry("/test_folder/test.txt", "test.txt", 1, FolderEntryType.File, "")
                ];
            }
            return [];
        });
        render(<App session={session} />);
        await activator();
        expect(screen.getByRole("textbox", { name: "Current folder path" })).toHaveValue("/test_folder");
        expect(await screen.findByText("test.txt")).toBeInTheDocument();
    }

    it("naviate to subfolder via double click", async () => {
        await naviateToSubfolderTest(async () => {
            const folderEntry = (await screen.findAllByText("test_folder")).find(e => e.parentElement.classList.contains("folder-entry"));
            expect(folderEntry).toBeInTheDocument();
            await userEvent.dblClick(folderEntry);
        });
    });

    it("naviate to subfolder via button", async () => {
        await naviateToSubfolderTest(async () => {
            const folderEntry = (await screen.findAllByText("test_folder")).find(e => e.parentElement.classList.contains("folder-entry"));
            expect(folderEntry).toBeInTheDocument();
            fireEvent.contextMenu(folderEntry);
            await userEvent.click(await findContextMenuEntry("Open"));
        }); 
    });

    it("navigate to subfolder via folder explorer", async () => {
        await naviateToSubfolderTest(async () => {
            await waitForElementToBeRemoved(screen.getByText("Loading..."));
            const folders = Array.from(document.getElementById("file-explorer").querySelectorAll("span"));
            const folder = folders.find(el => el.textContent.includes("test_folder"));
            expect(folder).toBeInTheDocument();
            await userEvent.click(folder);
        });
    });

    it("mobile tabs", async () => {
        connection.list.mockResolvedValueOnce([
            new FolderEntry("/test.txt", "test.txt", 1, FolderEntryType.File, "")
        ]);
        window.innerWidth = 360;
        render(<App session={session} />);
        
        expect(await screen.findByText("test.txt")).toBeInTheDocument();
        // Default tab
        expect(screen.getByRole("button", { name: "Current folder path" })).toBeVisible();
        
        await userEvent.click(screen.getByRole("button", { name: "Selection information and actions" }));
        expect(screen.getByRole("button", { name: "New Folder" })).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Folder explorer" }));
        expect(screen.getByText("/")).toBeInTheDocument();
    });

    it("compute size", async () => {
        connection.list.mockImplementation(async (path: string) => {
            if (path === "/") {
                return [
                    new FolderEntry("/test_folder", "test_folder", 1, FolderEntryType.Directory, "")
                ];
            } else if (path === "/test_folder") {
                return [
                    new FolderEntry("/test_folder/test1.txt", "test1.txt", 1, FolderEntryType.File, ""),
                    new FolderEntry("/test_folder/test2.txt", "test2.txt", 2, FolderEntryType.File, "")
                ];
            }
            return [];
        });
        render(<App session={session} />);
        const folderEntry = (await screen.findAllByText("test_folder")).find(e => e.parentElement.classList.contains("folder-entry"));
        expect(folderEntry).toBeInTheDocument();
        await userEvent.click(folderEntry);
        await userEvent.click(await screen.findByRole("button", { name: "Compute size" }));
        expect((await screen.findByText(/Size:/)).textContent).toBe("Size: 3 B");
    });
});

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