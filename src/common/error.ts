import Dialog from "./Dialog";

export function unexpectedErrorHandler(title: string) {
    return (err: unknown) => {
        Dialog.message(title, "An unexpected error occured: " + formatError(err));
        reportError(err, title);
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

export function reportError(error: unknown, message?: string) {
    console.error("Reported error: " + message, error);
}

export function assertUnreachable(x: never): never {
    throw new Error("unreachable, unexpected: " + String(x));
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

export class FTPError extends Error {
    code: number;

    constructor(message: string, code: number) {
        super(message);
        this.name = "FTPError";
        this.code = code;
    }
}

export class SFTPError extends Error {
    code: string | number;

    constructor(message: string, code: string | number) {
        super(message);
        this.name = "SFTPError";
        this.code = code;
    }
}
