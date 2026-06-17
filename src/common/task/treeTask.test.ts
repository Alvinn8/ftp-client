import { describe, expect, it } from "vitest";
import FTPSession from "@common/ftp/FTPSession";
import { FileTree, Status } from "./tree";
import { TreeTask, TreeTaskHandler } from "./treeTask";

function makeTreeTask(fileTree: FileTree) {
    const handler: TreeTaskHandler<unknown> = {
        file: () => {},
        beforeDirectory: () => {},
        afterDirectory: () => {},
    };
    // The constructor does not touch the session synchronously, so a stub is
    // sufficient for these unit tests.
    const session = {} as FTPSession;
    return new TreeTask(
        session,
        fileTree,
        { title: () => "test task" },
        handler,
    );
}

describe("TreeTask", () => {
    it("transitions the root directory to ERROR once maxAttempts is exceeded", () => {
        const root = new FileTree("/");
        const task = makeTreeTask(root);

        // Simulate repeated failures of the root beforeDirectory action.
        root.setError(new Error("boom"));
        for (let i = 0; i < task.maxAttempts; i++) {
            expect(root.getBeforeStatus()).not.toBe(Status.ERROR);
            root.retry();
        }
        expect(root.getBeforeStatus()).toBe(Status.ERROR);
    });
});
