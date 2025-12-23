import FTPConnection from "../ftp/FTPConnection";
import FTPSession from "../ftp/FTPSession";
import { FileTree } from "./tree";
import { TreeTask } from "./treeTask";

export async function performWithRetry<T>(session: FTPSession, directoryPath: string, action: (connection: FTPConnection) => Promise<T>): Promise<T> {
    return await new Promise((resolve, reject) => {
        const tree = new FileTree(directoryPath);
        session.taskManager.addTreeTask(new TreeTask(session, tree, {
            processRootDirectory: true,
            title: () => "Processing folder " + directoryPath,
        }, {
            beforeDirectory() {},
            async afterDirectory(directory, connection) {
                if (directory.path !== directoryPath) {
                    return;
                }
                const result = await action(connection);
                resolve(result);
            },
            file() {},
            cancelled(fileTree, connection) {
                reject(new Error("Operation cancelled"));
            },
        }));
    });
}
