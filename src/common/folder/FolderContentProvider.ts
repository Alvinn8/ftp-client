import FolderEntry from "./FolderEntry";

/**
 * Provides FolderEntries for directories.
 */
export default interface FolderContentProvider {
    /**
     * Get the folder entries of the folder specified by the path.
     *
     * @param priority The priority of the request.
     * @param path The path of the folder.
     */
    getFolderEntries(priority: number, path: string): Promise<FolderEntry[]>;
}