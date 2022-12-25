import React, { useEffect, useState } from "react";
import EditorControls from "../EditorControls";
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

    useEffect(() => {
        const data = window["textEditorData"];
        setData({
            text: data.text,
            absolutePath: data.absolutePath,
            valueProvider: {
                getValue() {
                    throw new Error("No valueProvider registered")
                }
            }
        });
        setAllowSaving(data.allowSaving);
        document.title = data.title;
    }, []);

    const handleSave = () => {
        const text = data.valueProvider.getValue();
        window["save"](text);
    };

    if (!data) return <p>Loading...</p>;

    return (
        <div className="text-editor-container">
            <>
                <EditorControls
                    allowSaving={allowSaving}
                    onSave={handleSave}
                />
                <EditorComponent {...data} />
                <EditorControls
                    allowSaving={allowSaving}
                    onSave={handleSave}
                />
            </>
        </div>
    );
};

export default TextEditor;