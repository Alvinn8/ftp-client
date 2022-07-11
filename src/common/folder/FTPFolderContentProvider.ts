import FolderContentProvider from "./FolderContentProvider";
import FolderEntry from "./FolderEntry";
import { app } from "../ui/index";

/**
 * An implementation of {@link FolderContentProvider} that fetches the folder
 * entries from the ftp server.
 */
export default class FTPFolderContentProvider implements FolderContentProvider {
    async getFolderEntries(priority: number, path: string): Promise<FolderEntry[]> {
        const list = await app.state.session.list(priority, path);
        const session = app.state.session;
        if (session != null) {
            session.cache[path] = list;
        }
        return list;
    }
}