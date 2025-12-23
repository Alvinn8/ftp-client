import FolderContentProvider from "./FolderContentProvider";
import FolderEntry from "./FolderEntry";
import { getApp } from "../ui/App";

/**
 * An implementation of {@link FolderContentProvider} that fetches the folder
 * entries from the ftp server.
 * @deprecated
 */
export default class FTPFolderContentProvider implements FolderContentProvider {
    async getFolderEntries(priority: number, path: string): Promise<FolderEntry[]> {
        const session = getApp().state.session;
        const list = await session.list(priority, path);
        session.cache[path] = list;
        return list;
    }
}