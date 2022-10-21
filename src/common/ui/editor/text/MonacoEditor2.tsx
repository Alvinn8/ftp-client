import { editor as monacoEditor, Uri } from "monaco-editor";
import React, { useEffect, useRef } from "react"
import { TextEditorData } from "./TextEditor2";

const MonacoEditor2: React.FC<TextEditorData> = ({ text, absolutePath, allowSaving }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) {
            const uri = Uri.file(absolutePath);
            const model = monacoEditor.createModel(
                text,
                null, // auto detect language from uri (file extention)
                uri
            );

            const editor = monacoEditor.create(ref.current, {
                model: model,
                theme: "vs" // TODO
            });

            const onResize = () => editor.layout();
            window.addEventListener("resize", onResize);

            return () => {
                editor.dispose();
                window.removeEventListener("resize", onResize);
            };
        }
    }, []);

    return <div ref={ref}></div>;
};
export default MonacoEditor2;