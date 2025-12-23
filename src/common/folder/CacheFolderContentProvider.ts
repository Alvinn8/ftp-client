import { getApp } from "../ui/App";
import FolderContentProvider from "./FolderContentProvider";
import FolderEntry from "./FolderEntry";
import NotCachedError from "./NotCachedError";

/**
 * An implementation of {@link FolderContentProvider} that looks at the cache
 * for folders that have already been fetched.
 * <p>
 * This provider will throw a {@link NotCachedError} if the current folder was
 * not cached. Therefore it should most of the time not be used directly, and
 * rather trough the main folder content provider.
 * @deprecated
 */
export default class CacheFolderContentProvider implements FolderContentProvider {
    async getFolderEntries(_priority: number, path: string): Promise<FolderEntry[]> {
        const session = getApp().state.session;
        if (session != null) {
            const cacheData = session.cache[path];
            if (cacheData != null) {
                return await Promise.resolve(cacheData);
            }
        }
        throw new NotCachedError();
    }
}