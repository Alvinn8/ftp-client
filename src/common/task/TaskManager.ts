import { EventEmitter } from "eventemitter3";
import { addMessage } from "../ui/messages";
import { TaskStatus, TreeTask } from "./treeTask";
import FTPSession from "../ftp/FTPSession";
import { Status } from "./tree";
import { unexpectedErrorHandler } from "../error";
import { useSession } from "../ui2/store/sessionStore";

export class TaskManager extends EventEmitter {
    private session: FTPSession;
    private treeTasks: TreeTask[] = [];
    private monitorIntervalId: number | null = null;

    setSession(session: FTPSession) {
        this.session = session;
        this.session.on("poolQueueEmpty", () => this.tickTreeTasks());
    }

    /**
     * Add a tree task to the manager.
     *
     * @param treeTask The tree task to add.
     */
    addTreeTask(treeTask: TreeTask) {
        this.treeTasks.push(treeTask);
        // Increase target connection count if there are many files.
        const pool = this.session.getConnectionPool();
        const current = pool.getTargetConnectionCount();
        const desired = this.suggestedParallelConnections(treeTask.count.totalFiles);
        if (desired > current) {
            pool.setTargetConnectionCount(desired);
        }
        treeTask.addNextSubTask(this.session);
        this.emit("change");
        this.session.tryExecutePoolRequest();
        const remove = () => {
            this.treeTasks = this.treeTasks.filter(t => t !== treeTask);
            this.emit("change");
        };
        treeTask.on("done", remove);
        treeTask.on("cancelled", remove);
        treeTask.on("statusChange", (status) => {
            if (status === Status.IN_PROGRESS) {
                this.session.tryExecutePoolRequest();
            }
        });
        this.startMonitor();
        console.log("Starting tree task " + treeTask.title);
    }

    getTreeTasks(): TreeTask[] {
        return this.treeTasks;
    }

    private tickTreeTasks() {
        for (const treeTask of this.treeTasks) {
            if (treeTask.status === TaskStatus.IN_PROGRESS) {
                treeTask.addNextSubTask(this.session);
            }
        }
    }

    startMonitor() {
        if (this.monitorIntervalId !== null) {
            return; // Already monitoring
        }
        this.monitorIntervalId = window.setInterval(() => {
            this.monitor();
        }, 1000);
    }

    stopMonitor() {
        if (this.monitorIntervalId !== null) {
            clearInterval(this.monitorIntervalId);
            this.monitorIntervalId = null;
        }
    }

    monitor() {
        if (this.treeTasks.length === 0) {
            this.stopMonitor();
            // No more tasks, reset paralllel connections to 1.
            this.session.getConnectionPool().setTargetConnectionCount(1);
            this.session.getConnectionPool().closeAllConnections();
            return;
        }
        this.session.getConnectionPool().refreshConnections().catch(unexpectedErrorHandler("Error refreshing connections in TaskManager"));
        this.tickTreeTasks();
        this.session.tryExecutePoolRequest();
    }

    pauseAllTreeTasks() {
        for (const treeTask of this.treeTasks) {
            treeTask.setPaused(true);
        }
    }

    private suggestedParallelConnections(totalFiles: number): number {
        if (totalFiles <= 0) return 1;
        if (totalFiles <= 5) return 1;
        if (totalFiles <= 20) return 2;
        if (totalFiles <= 50) return 3;
        if (totalFiles <= 100) return 4;
        if (totalFiles <= 200) return 5;
        if (totalFiles <= 400) return 6;
        if (totalFiles <= 600) return 7;
        if (totalFiles <= 800) return 8;
        if (totalFiles <= 1000) return 9;
        return 10;
    }
}

window.addEventListener("beforeunload", (event) => {
    const sessionStore = useSession.getState();
    if (!sessionStore.hasSession()) {
        return;
    }
    const taskManager = sessionStore.getSession().taskManager;
    if (taskManager.getTreeTasks().length > 0) {
        event.preventDefault();
        return (event.returnValue = "");
    }
});
