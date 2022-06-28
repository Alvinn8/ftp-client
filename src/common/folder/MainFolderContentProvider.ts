import { app } from "../ui/index";
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
    
    async getFolderEntries(path?: string): Promise<FolderEntry[]> {
        try {
            // Try get the files from the cache.
            return await FolderContentProviders.CACHE.getFolderEntries(path);
        } catch (e) {
            if (e instanceof NotCachedError) {
                // This folder was not cached, fetch from the ftp server.
                const pendingRequest = this.pendingRequests[path];
                if (pendingRequest) {
                    return await pendingRequest;
                } else {
                    if (!path) {
                        path = app.state.session.workdir;
                    }
                    const promise = FolderContentProviders.FTP.getFolderEntries(path);
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