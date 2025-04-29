import { ensureAbsolute } from "../utils";
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
    private pendingRequests: {[key: string]: Promise<FolderEntry[]>} = {};
    
    async getFolderEntries(priority: number, path?: string): Promise<FolderEntry[]> {
        ensureAbsolute(path);
        try {
            // Try get the files from the cache.
            return await FolderContentProviders.CACHE.getFolderEntries(priority, path);
        } catch (e) {
            if (e instanceof NotCachedError) {
                // This folder was not cached, fetch from the ftp server.
                const pendingRequest = this.pendingRequests[path];
                if (Boolean(pendingRequest)) {
                    return await pendingRequest;
                } else {
                    const promise = FolderContentProviders.FTP.getFolderEntries(priority, path);
                    this.pendingRequests[path] = promise;
                    const result = await promise;
                    delete this.pendingRequests[path];
                    return result;
                }
            } else {
                throw e;
            }
        }
    }
}