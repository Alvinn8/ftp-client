import React, { useEffect, useState } from "react";
import TextEditorControls from "../TextEditorControls";

interface TextEditorProps {
    allowSaving: boolean
    EditorComponent: React.FC<TextEditorData>;
}

export interface TextEditorData {
    text: string;
    allowSaving: boolean;
    absolutePath: string;
}

const TextEditor2: React.FC<TextEditorProps> = ({ EditorComponent, allowSaving }) => {
    const [data, setData] = useState<TextEditorData>(null);

    const onMessage = (e: MessageEvent) => {
        if ("text" in e.data && "absolutePath" in e.data && "allowSaving" in e.data) {
            setData(e.data as TextEditorData);
        }
    };

    useEffect(() => {
        window.addEventListener("message", onMessage);
        return () => {
            window.removeEventListener("message", onMessage);
        };
    }, []);

    if (!data) return <p>Loading...</p>;

    return (
        <div style={{ width: "100%", height: "100vh", display: "grid" }}>
            <>
                <EditorComponent {...data} />
                <TextEditorControls window={window} allowSaving={allowSaving} />
            </>
        </div>
    );
};

export default TextEditor2;