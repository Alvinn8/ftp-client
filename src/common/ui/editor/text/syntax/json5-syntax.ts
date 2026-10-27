import { setupTextMate } from "./textmate";
import { Registry } from "monaco-textmate";
import * as monaco from "monaco-editor";
import { wireTmGrammars } from "monaco-editor-textmate";

const JSON5_SYNTAX =
    "https://cdn.jsdelivr.net/gh/mrmlnc/vscode-json5@1.0.0/syntaxes/json5.json";

export async function registerJson5Language(
    editor: monaco.editor.IStandaloneCodeEditor,
) {
    await setupTextMate();

    const registry = new Registry({
        getGrammarDefinition: async (scopeName) => {
            return {
                format: "json",
                content: await (await fetch(JSON5_SYNTAX)).text(),
            };
        },
    });

    const grammars = new Map();
    grammars.set("json5", "source.json5");

    monaco.languages.register({
        id: "json5",
        extensions: [".json5"],
    });

    await wireTmGrammars(monaco, registry, grammars, editor);
}
