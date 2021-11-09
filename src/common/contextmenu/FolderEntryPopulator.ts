import FolderEntry from "../folder/FolderEntry";
import { openImageEditor, openTextEditor } from "../ui/editor/editor";
import { getFileType } from "../ui/FileFormats";
import { app } from "../ui/index";
import { deleteFolderEntries, downloadAsZip, downloadFolderEntry, rename } from "./actions";
import ContextMenuEntry from "./ContextMenuEntry";
import ContextMenuPopulator from "./ContextMenuPopulator";

/**
 * A ContextMenuPopulator for when one folder entry is selected.
 */
export default class FolderEntryPopulator implements ContextMenuPopulator {
    private readonly entry: FolderEntry;

    /**
     * Create a new FolderEntryPopulator from a folder entry.
     *
     * @param folderEntry The folder entry this context menu should be about.
     */
    constructor(folderEntry: FolderEntry) {
        this.entry = folderEntry;
    }
    
    getEntries(): ContextMenuEntry[] {
        const entries: ContextMenuEntry[] = [];
        if (this.entry.isFile()) {
            const fileType = getFileType(this.entry.name);

            if (fileType == "image") {
                entries.push({
                    name: "View Image",
                    handler: e => {
                        openImageEditor(this.entry);
                    }
                });
            } else if (fileType == "text") {
                entries.push({
                    name: "Open",
                    handler: e => {
                        openTextEditor(this.entry);
                    }
                });
            }

            entries.push({
                name: "Download",
                handler: async e => {
                    downloadFolderEntry(this.entry);
                }
            });
        } else if (this.entry.isDirectory()) {
            entries.push({
                name: "Open",
                handler: () => {
                    app.state.session.cd(this.entry.name);
                }
            });
            entries.push({
                name: "Download",
                handler: async e => {
                    downloadAsZip([ this.entry ]);
                }
            });
        }

        entries.push({
            name: "Rename",
            handler: e => {
                rename(this.entry);
            }
        });

        entries.push({
            name: "Delete",
            handler: async e => {
                deleteFolderEntries([ this.entry ]);
            }
        });

        return entries;
    }

}