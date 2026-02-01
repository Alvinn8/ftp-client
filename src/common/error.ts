import Dialog from "./Dialog";

export function unexpectedErrorHandler(title: string) {
    return (err: unknown) => {
        Dialog.message(
            title,
            "An unexpected error occured: " + formatError(err),
        );
        reportError(err, title);
    };
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
    const reportedError = new ReportedError(
        message || "An error was reported",
        { cause: error },
    );
    console.error("Reported error:", reportedError);
}

export function assertUnreachable(x: never): never {
    throw new Error("unreachable, unexpected: " + String(x));
}

export function getDomPath(element: Node | null): string {
    const path: string[] = [];
    let el: Node | null = element;
    while (el) {
        let name = el.nodeName.toLowerCase();
        if (el instanceof HTMLElement && el.id) {
            name += `#${el.id}`;
            path.unshift(name);
            break;
        } else if (el.parentNode) {
            const siblings = Array.from(el.parentNode.childNodes).filter(
                (child) => child.nodeName === el!.nodeName,
            );
            if (siblings.length > 1) {
                const index = siblings.indexOf(el as ChildNode);
                name += `:nth-of-type(${index + 1})`;
            }
        }
        path.unshift(name);
        el = el.parentNode;
    }
    return path.join(" > ");
}

export class ReportedError extends Error {
    constructor(message: string, opts: { cause: unknown }) {
        super(message, opts);
        this.name = "ReportedError";
    }
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

export class CancellationError extends Error {
    constructor(message: string = "Operation cancelled") {
        super(message);
        this.name = "CancellationError";
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
