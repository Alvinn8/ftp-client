import FolderEntry from "../folder/FolderEntry";
import { deleteFolderEntries, downloadAsZip } from "./actions";
import ContextMenuEntry from "./ContextMenuEntry";
import ContextMenuPopulator from "./ContextMenuPopulator";

/**
 * A ContextMenuPopulator for when multiple folder entries are selected.
 */
export default class FolderEntriesPopulator implements ContextMenuPopulator {
    private readonly entries: FolderEntry[];

    /**
     * Create a new FolderEntriesPopulator from a list of foler entries.
     *
     * @param folderEntries The folder entries this context menu should be about.
     */
    constructor(folderEntries: FolderEntry[]) {
        this.entries = folderEntries;
    }

    getEntries(): ContextMenuEntry[] {
        const entries: ContextMenuEntry[] = [];

        entries.push({
            name: "Download as zip",
            handler: async e => {
                downloadAsZip(this.entries);
            }
        });

        entries.push({
            name: "Delete",
            handler: async e => {
                deleteFolderEntries(this.entries);
            }
        });

        return entries;
    }
}