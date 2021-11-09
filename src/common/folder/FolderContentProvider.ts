import FolderEntry from "./FolderEntry";

/**
 * Provides FolderEntries for directories.
 */
export default interface FolderContentProvider {
    /**
     * Get the folder entries of this current folder.
     * <p>
     * Implementation may be async, so await this method.
     * @async
     */
    getFolderEntries(): Promise<FolderEntry[]>;

    /**
     * Get the folder entries of the folder specified by the path.
     * <p>
     * Implementation may be async, so await this method.
     * @async
     *
     * @param path The path of the folder.
     */
    getFolderEntriesFor(path: string): Promise<FolderEntry[]>;
}