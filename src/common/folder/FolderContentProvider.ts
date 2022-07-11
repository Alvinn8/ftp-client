import FolderEntry from "./FolderEntry";

/**
 * Provides FolderEntries for directories.
 */
export default interface FolderContentProvider {
    /**
     * Get the folder entries of the folder specified by the path.
     *
     * @param path The path of the folder.
     */
    getFolderEntries(path: string): Promise<FolderEntry[]>;
}