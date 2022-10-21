import React, { useEffect, useState } from "react";
import TextEditorControls from "./TextEditorControls";
import "./TextEditor.css";

interface TextEditorProps {
    EditorComponent: React.FC<TextEditorData>;
}

export interface TextEditorData {
    text: string;
    absolutePath: string;
    valueProvider: {
        getValue(): string;
    }
}

const TextEditor: React.FC<TextEditorProps> = ({ EditorComponent }) => {
    const [data, setData] = useState<TextEditorData>(null);
    const [allowSaving, setAllowSaving] = useState(false);

    const onMessage = (e: MessageEvent) => {
        if ("text" in e.data && "absolutePath" in e.data && "allowSaving" in e.data) {
            setData({
                text: e.data.text,
                absolutePath: e.data.absolutePath,
                valueProvider: {
                    getValue() {
                        throw new Error("No valueProvider registered")
                    }
                }
            });
            setAllowSaving(e.data.allowSaving);
            document.title = e.data.title;
        }
    };

    useEffect(() => {
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, []);

    if (!data) return <p>Loading...</p>;

    return (
        <div className="text-editor-container">
            <>
                <EditorComponent {...data} />
                <TextEditorControls
                    allowSaving={allowSaving}
                    valueProvider={data.valueProvider}
                />
            </>
        </div>
    );
};

export default TextEditor;