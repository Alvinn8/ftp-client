import React, {useEffect, useState} from "react";

interface TextEditorControlsProps {
    allowSaving: boolean;
    valueProvider: {
        getValue(): string;
    }
}

const TextEditorControls: React.FC<TextEditorControlsProps> = ({ allowSaving, valueProvider }) => {
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
        const text = valueProvider.getValue();
        window["save"](text);
    };

    const onMessage = (e: MessageEvent) => {
        if (e.data.action == "save-callback") {
            setSaving(false);
        }
    };

    useEffect(() => {
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
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

export default TextEditorControls;