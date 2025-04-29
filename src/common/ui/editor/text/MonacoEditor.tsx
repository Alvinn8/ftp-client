import { editor as monacoEditor, Uri } from "monaco-editor";
import React, { useEffect, useRef } from "react";
import { isDarkTheme } from "../../theme";
import { TextEditorData } from "./TextEditor";
import { unexpectedErrorHandler } from "../../../error";

const MonacoEditor: React.FC<TextEditorData> = ({ text, absolutePath, valueProvider }) => {
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
                theme: isDarkTheme() ? "vs-dark" : "vs"
            });

            valueProvider.getValue = () => editor.getValue();

            const onResize = () => editor.layout();
            window.addEventListener("resize", onResize);

            if (absolutePath.endsWith(".sk")) {
                import("./syntax/skript-syntax").then(({ registerSkriptLanguage }) => {
                    registerSkriptLanguage(editor)
                        .catch(unexpectedErrorHandler("Failed to Register skript syntax highlighting"));
                }).catch(unexpectedErrorHandler("Failed to Load skript syntax highlighting"));
            } else if (absolutePath.endsWith(".mcfunction")) {
                import("./syntax/mcfunction-syntax").then(({ registerMcfunctionLanguage }) => {
                    registerMcfunctionLanguage(editor)
                        .catch(unexpectedErrorHandler("Failed to Register mcfunction syntax highlighting"));
                }).catch(unexpectedErrorHandler("Failed to Load mcfunction syntax highlighting"));
            }

            return () => {
                editor.dispose();
                window.removeEventListener("resize", onResize);
            };
        }
    }, []);

    return <div ref={ref} style={{ overflow: "hidden" }} />;
};
export default MonacoEditor;