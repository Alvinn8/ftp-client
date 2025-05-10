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
