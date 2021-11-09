import FolderContentProvider from "./FolderContentProvider";
import FolderContentProviders from "./FolderContentProviders";
import FolderEntry from "./FolderEntry";
import NotCachedError from "./NotCachedError";

/**
 * An implementation of {@link FolderContentProvider} that first checks the
 * cache and returns the folder entries directly if they were cached. Otherwise
 * it fetches them from the ftp server.
 */
export default class MainFolderContentProvider implements FolderContentProvider {
    async getFolderEntries(): Promise<FolderEntry[]> {
        try {
            // Try get the files from the cache.
            return await FolderContentProviders.CACHE.getFolderEntries();
        } catch (e) {
            if (e instanceof NotCachedError) {
                // This folder was not cached, fetch from the ftp server.
                return await FolderContentProviders.FTP.getFolderEntries();
            } else {
                throw e;
            }
        }
    }

    async getFolderEntriesFor(path: string): Promise<FolderEntry[]> {
        try {
            // Try get the files from the cache.
            return await FolderContentProviders.CACHE.getFolderEntriesFor(path);
        } catch (e) {
            if (e instanceof NotCachedError) {
                // This folder was not cached, fetch from the ftp server.
                return await FolderContentProviders.FTP.getFolderEntriesFor(path);
            } else {
                throw e;
            }
        }
    }
}