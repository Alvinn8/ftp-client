import FolderContentProvider from "./FolderContentProvider";
import FolderEntry from "./FolderEntry";
import { app } from "../ui/index";

/**
 * An implementation of {@link FolderContentProvider} that fetches the folder
 * entries from the ftp server.
 */
export default class FTPFolderContentProvider implements FolderContentProvider {
    async getFolderEntries(path?: string): Promise<FolderEntry[]> {
        const connection = await app.state.session.getConnection();
        const list = await connection.list(path);
        const session = app.state.session;
        if (session != null) {
            session.cache[path ? path : session.workdir] = list;
        }
        return list;
    }
}