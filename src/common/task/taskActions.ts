import FTPConnection from "../ftp/FTPConnection";
import FTPSession from "../ftp/FTPSession";
import { FileTree } from "./tree";
import { TreeTask } from "./treeTask";

export function directoryAction(session: FTPSession, directoryPath: string, action: (connection: FTPConnection) => Promise<void>) {
    const tree = new FileTree(directoryPath);
    session.taskManager.addTreeTask(new TreeTask(session, tree, {
        processRootDirectory: true,
        title: () => "Processing directory " + directoryPath,
    }, {
        beforeDirectory() {},
        async afterDirectory(directory, connection) {
            if (directory.path !== directoryPath) {
                return;
            }
            await action(connection);
        },
        file() {},
    }));
}
