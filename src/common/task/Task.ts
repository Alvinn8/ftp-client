import { getApp } from "../ui/App";
import TaskComponent from "../ui/task/TaskComponent";

/**
 * A task that is currently running.
 * <p>
 * A task can have a progress bar which will be displayed to the user.
 * 
 * @see Tasks
 */
export default class Task {
    public readonly title: string;
    public readonly body: string;
    public readonly hasProgressBar: boolean;
    public component: TaskComponent;

    constructor(title: string, body: string, hasProgressBar: boolean) {
        this.title = title;
        this.body = body;
        this.hasProgressBar = hasProgressBar;
    }


    public complete() {
        getApp().tasks.finishTask(this);
    }

    public progress(value: number, max: number, body?: string) {
        if (this.component != null) {
            this.component.setState({
                value: value,
                max: max,
                bodyOverride: body
            });
        }
    }
}