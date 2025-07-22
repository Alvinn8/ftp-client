import { setupTextMate } from "./textmate";
import { Registry } from "monaco-textmate";
import * as monaco from "monaco-editor";
import { wireTmGrammars } from 'monaco-editor-textmate'

const TOML_SYNTAX = "https://cdn.jsdelivr.net/gh/oovm/vscode-toml@master/extension/toml.tmLanguage.json";

export async function registerTomlLanguage(editor: monaco.editor.IStandaloneCodeEditor) {
    await setupTextMate();

    const registry = new Registry({
        getGrammarDefinition: async (scopeName) => {
            return {
                format: 'json',
                content: await (await fetch(TOML_SYNTAX)).text()
            }
        }
    });

    const grammars = new Map();
    grammars.set("toml", "source.toml");

    monaco.languages.register({
        id: 'toml',
        extensions: ['.toml'],
    });

    await wireTmGrammars(monaco, registry, grammars, editor);
}
