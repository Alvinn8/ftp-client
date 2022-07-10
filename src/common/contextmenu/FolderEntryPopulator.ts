import FolderEntry from "../folder/FolderEntry";
import { openEditor, openImageEditor } from "../ui/editor/editor";
import { getFileType } from "../ui/FileFormats";
import { deleteFolderEntries, downloadAsZip, downloadFolderEntry, rename } from "./actions";
import ContextMenuEntry from "./ContextMenuEntry";
import ContextMenuPopulator from "./ContextMenuPopulator";

/**
 * A ContextMenuPopulator for when one folder entry is selected.
 */
export default class FolderEntryPopulator implements ContextMenuPopulator {
    private readonly entry: FolderEntry;
    private readonly onChangeDirectory: (path: string) => void;

    /**
     * Create a new FolderEntryPopulator from a folder entry.
     *
     * @param folderEntry The folder entry this context menu should be about.
     * @param onChangeDirectory A function to call to change the directory.
     */
    constructor(folderEntry: FolderEntry, onChangeDirectory: (path: string) => void) {
        this.entry = folderEntry;
        this.onChangeDirectory = onChangeDirectory;
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
            } else {
                entries.push({
                    name: "Open",
                    handler: e => {
                        openEditor(this.entry);
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
                    this.onChangeDirectory(this.entry.path);
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