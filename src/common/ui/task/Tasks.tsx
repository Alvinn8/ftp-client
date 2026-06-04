import * as React from "react";
import { TreeTask } from "../../task/treeTask";
import TreeTaskComponent from "./TreeTaskComponent";
import TreeTaskDetails from "./TreeTaskDetails";
import { useSession } from "../../ui2/store/sessionStore";

/**
 * Displays the running task.
 * <p>
 * Only one task can run at once.
 */
const Tasks: React.FC = () => {
    const [treeTasks, setTreeTasks] = React.useState<TreeTask[]>([]);
    const [treeTaskDetails, setTreeTaskDetails] = React.useState<TreeTask | null>(null);
    const { session } = useSession();

    React.useEffect(() => {
        if (!session) {
            return;
        }
        const handleTaskChange = () => {
            setTreeTasks([...session.taskManager.getTreeTasks()]);
        };

        session.taskManager.on("change", handleTaskChange);
        return () => {
            session.taskManager.off("change", handleTaskChange);
        };
    }, [session]);

    // Auto-switch to next task when a task signals its next task
    React.useEffect(() => {
        if (!treeTaskDetails) return;

        const handleNextTask = (nextTask: TreeTask) => {
            setTreeTaskDetails(nextTask);
        };

        treeTaskDetails.on("nextTask", handleNextTask);
        return () => {
            treeTaskDetails.off("nextTask", handleNextTask);
        };
    }, [treeTaskDetails]);

    return (
        <div className="d-flex flex-column gap-2">
            {treeTasks.map((treeTask, index) => (
                <TreeTaskComponent key={index} treeTask={treeTask} onShowDetails={() => setTreeTaskDetails(treeTask)} />
            ))}
            {treeTaskDetails && (
                <TreeTaskDetails treeTask={treeTaskDetails} onClose={() => setTreeTaskDetails(null)} />
            )}
        </div>
    );
};

export default Tasks;
