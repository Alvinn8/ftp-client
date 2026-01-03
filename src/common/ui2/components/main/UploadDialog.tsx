import { Modal } from "bootstrap";
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { usePath } from "../../store/pathStore";
import Button from "../elements/Button";
import { useDragAndDrop } from "../../../ui/DropZone";
import {
    directoryUpload,
    fileUpload,
    handleOnDrop,
    setZipUploadMode,
} from "../../../upload/upload";
import { unexpectedErrorHandler } from "../../../error";

interface UploadDialogProps {
    onClose: () => void;
}

const UploadDialog: React.FC<UploadDialogProps> = ({ onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const path = usePath((state) => state.path);
    const dropzone = useRef<HTMLDivElement>(null);
    const dropZoneElement = useDragAndDrop(dropzone, (e) => {
        handleOnDrop(e).catch(unexpectedErrorHandler("Failed to upload"));
        onClose();
    });

    useEffect(() => {
        const modalElement = modalRef.current;
        if (modalElement) {
            const modal = new Modal(modalElement, {
                backdrop: true,
                keyboard: true,
            });
            modal.show();
            const handleClose = () => onClose?.();
            modalElement.addEventListener("hidden.bs.modal", handleClose);
            return () => {
                modal.hide();
                modalElement.removeEventListener(
                    "hidden.bs.modal",
                    handleClose,
                );
            };
        }
    }, []);

    return createPortal(
        <div className="modal" tabIndex={-1} ref={modalRef}>
            <div className="modal-dialog">
                <div className="modal-content bg-base-ui2 text-color">
                    <div className="modal-header">
                        <h5 className="modal-title me-auto">
                            <i className="bi bi-upload" />
                            <span>&nbsp;Upload Files</span>
                        </h5>
                        <button
                            type="button"
                            className="btn-close ms-1"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        ></button>
                    </div>
                    <div className="modal-body">
                        <small>
                            <span className="text-muted-color">
                                {"Upload files to "}
                            </span>
                            <span>{path}</span>
                        </small>
                        <div
                            ref={dropzone}
                            className="w-100 m-2 p-5 border rounded d-flex flex-column align-items-center justify-content-center gap-1"
                        >
                            <div
                                className="rounded-circle bg-highlight-ui2 m-auto d-flex align-items-center justify-content-center"
                                style={{
                                    width: "60px",
                                    height: "60px",
                                    fontSize: "24px",
                                }}
                            >
                                <i className="bi bi-upload text-muted-color"></i>
                            </div>
                            <span>Drop files or folders here</span>
                            <span className="text-muted-color">or</span>
                            <div className="d-flex gap-2">
                                <Button
                                    icon="file-earmark"
                                    label="Select Files"
                                    size="small"
                                    onClick={() => {
                                        setZipUploadMode(false);
                                        fileUpload.click();
                                        onClose();
                                    }}
                                />
                                <Button
                                    icon="folder"
                                    label="Select Folders"
                                    size="small"
                                    onClick={() => {
                                        directoryUpload.click();
                                        onClose();
                                    }}
                                />
                                <Button
                                    icon="file-zip"
                                    label="Select ZIP"
                                    size="small"
                                    onClick={() => {
                                        setZipUploadMode(true);
                                        fileUpload.click();
                                        onClose();
                                    }}
                                />
                            </div>
                        </div>
                        {dropZoneElement}
                    </div>
                    <div className="modal-footer">
                        <div className="d-flex flex-wrap gap-1 w-100">
                            <Button
                                onClick={onClose}
                                className="ms-auto"
                                label="Close"
                                severity="primary"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default UploadDialog;
