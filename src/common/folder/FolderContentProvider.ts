import FolderEntry from "./FolderEntry";

/**
 * Provides FolderEntries for directories.
 */
export default interface FolderContentProvider {
    /**
     * Get the folder entries of the folder specified by the path.
     * <p>
     * If the path is not provided, the current folder will be used.
     * <p>
     * Implementation may be async, so await this method.
     * @async
     *
     * @param path The path of the folder.
     */
    getFolderEntries(path: string): Promise<FolderEntry[]>;
}