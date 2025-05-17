import Dialog from "./Dialog";

export function unexpectedErrorHandler(title: string) {
    return (err: unknown) => {
        Dialog.message(title, "An unexpected error occured: " + formatError(err));
    }
}

export function formatError(error: unknown) {
    let str = String(error);
    if (error instanceof Error && error.cause) {
        str += " Caused by: " + formatError(error.cause);
    }
    if (!/^[A-Za-z]*Error:/.test(str)) {
        str = "Error: " + str;
    }
    return str;
}

export class ConnectionClosedError extends Error {
    code: number;
    reason: string;

    constructor(message: string, code: number, reason: string) {
        super(message);
        this.name = "ConnectionClosedError";
        this.code = code;
        this.reason = reason;
    }
}
