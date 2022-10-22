import React, {useEffect, useState} from "react";

interface TextEditorControlsProps {
    allowSaving: boolean;
    onSave?: () => void;
}

const EditorControls: React.FC<TextEditorControlsProps> = ({ allowSaving, onSave }) => {
    const close = () => {
        if (window.opener) {
            // When the editor is created using a window, it can simply be closed using
            // window.close in the child window.
            window.close();
        } else {
            // When the editor is created using an iframe, we must notify the parent
            // window to let it remove the iframe.
            window["doClose"]();
        }
    };

    const [saving, setSaving] = useState(false);

    const save = () => {
        setSaving(true);
        if (onSave) onSave();
    };

    const handleMessage = (e: MessageEvent) => {
        if (e.data.action == "save-callback") {
            setSaving(false);
        }
    };

    useEffect(() => {
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    return (
        <div className="p-3">
            <button className="btn btn-secondary" onClick={close}>Close</button>
            {allowSaving && (
                <button
                    className="btn btn-primary float-end"
                    onClick={save}
                    disabled={saving}>
                    {saving ? <div className="spinner-border" role="status" /> : "Save"}
                </button>
            )}
        </div>
    );
};

export default EditorControls;