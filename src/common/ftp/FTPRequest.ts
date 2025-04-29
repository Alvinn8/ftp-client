import FTPConnection from "./FTPConnection";

export default class FTPRequest<T> {
    public readonly priority: number;
    public readonly executor: (connection: FTPConnection) => Promise<T> | T;
    public readonly resolve: (t: T) => void;
    public readonly reject: (e: any) => void;

    constructor(priority: number, executor: (connection: FTPConnection) => Promise<T> | T, resolve: (t: T) => void, reject: (e: any) => void) {
        this.priority = priority;
        this.executor = executor;
        this.resolve = resolve;
        this.reject = reject;
    }
}