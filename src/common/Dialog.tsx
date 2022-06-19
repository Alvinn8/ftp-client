import * as React from "react";
import * as ReactDOM from "react-dom";

/**
 * Utilities for creating modal windows for displaying text or asking the user
 * about something.
 */
namespace Dialog {
    /**
     * Show a message dialog to the user.
     * 
     * @param title The title to display on the modal.
     * @param text The text displayed to the user.
     */
     export function message(title: string, text: string) {
        const modalRef: React.RefObject<HTMLDivElement> = React.createRef();
        const modalElement =
            <div className="modal" tabIndex={-1} ref={modalRef}>
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{title}</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <p>{text}</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>;

        const container = document.createElement("div");
        document.body.appendChild(container);

        ReactDOM.render(modalElement, container);

        // @ts-ignore
        const modal = new bootstrap.Modal(modalRef.current, {
            backdrop: true,
            keyboard: true
        });

        modal.show();

        modalRef.current.addEventListener("hidden.bs.modal", function () {
            modal.dispose()
            container.remove();
        });
    }

    /**
     * Prompt the user for a text input.
     * 
     * @param title The title to display on the modal.
     * @param text The text displayed to the user.
     * @param submitButtonText The text to put on the submit button.
     * @param defaultValue The default value to put in the input.
     * @param onOk A callback called when the user clicks ok.
     * @param onCancel A callback called when the user clicks cancel.
     */
    export function prompt(title: string, text: string, submitButtonText: string, defaultValue: string, onOk: (result: string) => void, onCancel?: () => void) {
        let done = false;
        const modalRef: React.RefObject<HTMLDivElement> = React.createRef();
        const inputRef: React.RefObject<HTMLInputElement> = React.createRef();
        const modalElement =
            <div className="modal" tabIndex={-1} ref={modalRef}>
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{title}</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <p>{text}</p>
                            <input type="text" ref={inputRef} className="form-control" />
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={() => {
                                done = true;
                                onOk(inputRef.current.value);
                            }}>{submitButtonText}</button>
                        </div>
                    </div>
                </div>
            </div>;

        const container = document.createElement("div");
        document.body.appendChild(container);

        ReactDOM.render(modalElement, container);

        inputRef.current.value = defaultValue;

        // @ts-ignore
        const modal = new bootstrap.Modal(modalRef.current, {
            backdrop: true,
            keyboard: true
        });

        modal.show();

        modalRef.current.addEventListener("hidden.bs.modal", function () {
            modal.dispose()
            container.remove();
        });

        modalRef.current.addEventListener("hide.bs.modal", function () {
            // Wait a bit so the onClick for the submit button runs if applicable
            setTimeout(() => {
                if (!done && typeof onCancel == "function") {
                    onCancel();
                }
            }, 1);
        });
    }

    export interface Option {
        /** Used to identify the chosen option. */
        id: string;
        /** Displayed to the user. */
        name: string;
    }

    /**
     * Prompt the user to choose one of the provided options.
     * 
     * The options list contains a list of {@link Option} objects. The id of the option
     * that the user chooses will be returned. The name is what will be displayed to
     * the user.
     * 
     * If the {@code allowCancel} option is set to true a cancel button will be present.
     * If the user clicks this button, {@code null} will be returned.
     * 
     * @param title The title to display on the modal.
     * @param text The text to display above the options.
     * @param options A list of options the user can choose.
     * @param allowCancel Whether a cancel button should be present.
     * @returns The id of the option the user chose, or null if they cancelled.
     */
    export async function choose(title: string, text: string, options: Option[], allowCancel = true): Promise<string> {
        return new Promise(function (resolve, reject) {
            const ref: React.RefObject<HTMLDivElement> = React.createRef();
            const modalElement =
                <div className="modal" tabIndex={-1} ref={ref}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{title}</h5>
                                {allowCancel && (
                                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                )}
                            </div>
                            <div className="modal-body">
                                <p>{text}</p>
                                <div className="list-group">
                                    {options.map((value, index) => {
                                        return <li className="list-group-item list-group-item-action cursor-pointer" onClick={() => resolve(value.id)} data-bs-dismiss="modal" key={index}>{value.name}</li>
                                    })}
                                </div>
                            </div>
                            {allowCancel && (
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>;

            const container = document.createElement("div");
            document.body.appendChild(container);

            ReactDOM.render(modalElement, container);

            // @ts-ignore
            const modal = new bootstrap.Modal(ref.current, {
                backdrop: allowCancel ? true : "static",
                keyboard: allowCancel
            });

            modal.show();

            ref.current.addEventListener("hidden.bs.modal", function() {
                modal.dispose()
                container.remove();
            });
        });
    }

    /**
     * Ask the user for confirmation.
     * 
     * @param title The title to display on the modal.
     * @param text The text displayed to the user.
     * @param cancelButtonText The text on the cancel button.
     * @param confirmButtonText The text on the confirm button.
     */
    export async function confirm(title: string, text: string, cancelButtonText = "Cancel", confirmButtonText = "OK"): Promise<boolean> {
        return new Promise(function (resolve, reject) {
            let confirmed = false;
            const ref: React.RefObject<HTMLDivElement> = React.createRef();
            const modalElement =
                <div className="modal" tabIndex={-1} ref={ref}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{title}</h5>
                                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div className="modal-body">
                                <p>{text}</p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">{cancelButtonText}</button>
                                <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={() => confirmed = true}>{confirmButtonText}</button>
                            </div>
                        </div>
                    </div>
                </div>;

            const container = document.createElement("div");
            document.body.appendChild(container);

            ReactDOM.render(modalElement, container);

            // @ts-ignore
            const modal = new bootstrap.Modal(ref.current, {
                backdrop: true,
                keyboard: true
            });

            modal.show();

            ref.current.addEventListener("hidden.bs.modal", function () {
                modal.dispose()
                container.remove();
            });

            ref.current.addEventListener("hide.bs.modal", function () {
                // Wait a bit so the onClick for the confirm button runs if applicable
                setTimeout(() => {
                    resolve(confirmed);
                }, 1);
            });

        });
    }
}
export default Dialog;