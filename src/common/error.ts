import Dialog from "./Dialog";

export function unexpectedErrorHandler(title: string) {
    return (err: unknown) => {
        Dialog.message(title, "An unexpected error occured: " + err);
    }
}
