import { editor as monacoEditor, Uri } from "monaco-editor";
import React, { useEffect, useRef } from "react";
import { isDarkTheme } from "@common/ui/theme";
import { TextEditorData } from "./TextEditor";
import { unexpectedErrorHandler } from "@common/util/error";
import { findTextMateLanguage } from "./syntax/languages";

const MonacoEditor: React.FC<TextEditorData> = ({
    text,
    absolutePath,
    readOnly,
    valueProvider,
}) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) {
            const uri = Uri.file(absolutePath);
            const model = monacoEditor.createModel(
                text,
                null, // auto detect language from uri (file extention)
                uri,
            );

            const editor = monacoEditor.create(ref.current, {
                model: model,
                theme: isDarkTheme() ? "vs-dark" : "vs",
                readOnly: readOnly,
            });

            valueProvider.getValue = () => editor.getValue();

            const onResize = () => editor.layout();
            window.addEventListener("resize", onResize);

            const textMateLanguage = findTextMateLanguage(absolutePath);
            if (textMateLanguage) {
                import("./syntax/textmate")
                    .then(
                        async ({ registerTextMateLanguage }) =>
                            await registerTextMateLanguage(
                                textMateLanguage,
                                editor,
                            ),
                    )
                    .catch(
                        unexpectedErrorHandler(
                            `Failed to load ${textMateLanguage.id} syntax highlighting`,
                        ),
                    );
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
