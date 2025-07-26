import * as React from "react";
import Task from "../../task/Task";
import TaskComponent from "./TaskComponent";
import { TreeTask } from "../../task/treeTask";
import taskManager from "../../task/TaskManager";
import TreeTaskComponent from "./TreeTaskComponent";

interface TasksState {
    task: Task;
    treeTasks: TreeTask[];
}
/**
 * Displays the running task.
 * <p>
 * Only one task can run at once.
 */
const Tasks: React.FC = () => {
    const [task, setTask] = React.useState<Task | null>(null);
    const [treeTasks, setTreeTasks] = React.useState<TreeTask[]>([]);

    React.useEffect(() => {
        const handleTaskChange = (newTask: Task) => {
            setTask(newTask);
            setTreeTasks([...taskManager.getTreeTasks()]);
        };

        taskManager.on("change", handleTaskChange);
        return () => {
            taskManager.off("change", handleTaskChange);
        };
    }, []);

    return (
        <div className="d-flex flex-column gap-2">
            {task != null && (
                <TaskComponent task={task} />
            )}
            {treeTasks.map((treeTask, index) => (
                <TreeTaskComponent key={index} treeTask={treeTask} />
            ))}
        </div>
    );
};

export default Tasks;
