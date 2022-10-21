import TextEditor, { TextEditorWindow } from "./TextEditor";

/** @deprecated */
class MonacoEditor implements TextEditor {
    isLoaded(wind: MonacoWindow): boolean {
        return "monaco" in wind;
    }

    load(wind: MonacoWindow): Promise<void> {
        return new Promise(function (resolve, reject) {
            const script = wind.document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/monaco-editor@0.20.0/min/vs/loader.js";
            script.onerror = reject;
            script.onload = () => {
                wind.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.20.0/min/vs' } });

                wind.require(['vs/editor/editor.main'], function () {
                    // Check if we are using dark mode
                    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

                    // TODO all editors will need a container?
                    const container = wind.document.createElement("div");
                    container.id = "editor";
                    wind.document.body.appendChild(container);
                    
                    wind.editor = wind.monaco.editor.create(container, {
                        theme: isDarkMode ? 'vs-dark' : 'vs'
                    });
                });

                wind.onresize = () => wind.editor.layout();

                resolve();
            };
            wind.document.head.appendChild(script);
        });
    }

    getCurrentText(wind: MonacoWindow): string {
        return wind.editor.getValue();
    }

    open(wind: MonacoWindow, text: string, absolutePath: string): void {
        const uri = wind.monaco.Uri.file(absolutePath);
        const model = wind.monaco.editor.createModel(
            text,
            null, // auto detect language from uri (file extention)
            uri
        );
        wind.editor.setModel(model);
    }

}

/** @deprecated */
type MonacoWindow = TextEditorWindow & {
    require: {
        config: (obj: { paths: { vs: string }}) => void;
        (modules: string[], callback: () => void): void
    };
    monaco: {
        Uri: MonacoUri;
        editor: {
            create(element: HTMLElement, config: { theme: "vs" | "vs-dark" }): MonacoWindow["editor"];
            createModel(value: string, language: string | null, uri: MonacoUri): MonacoModel;
        }
    };
    editor: {
        layout(): void;
        getValue(): string;
        setModel(model: MonacoModel): void;
    };
};

declare class MonacoUri {};
interface MonacoUri {
    file(path: string): MonacoUri
}
declare class MonacoModel {};

export default new MonacoEditor();