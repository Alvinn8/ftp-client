import { setupTextMate } from "./textmate";
import { Registry } from "monaco-textmate";
import * as monaco from "monaco-editor";
import { wireTmGrammars } from 'monaco-editor-textmate'

const SKRIPT_SYNTAX = "https://cdn.jsdelivr.net/gh/AyhamAl-Ali/Sk-VSC@2.6.5/src/syntaxes/Sk-VSC.json";

export async function registerSkriptLanguage(editor: monaco.editor.IStandaloneCodeEditor) {
    await setupTextMate();

    const registry = new Registry({
        getGrammarDefinition: async (scopeName) => {
            return {
                format: 'json',
                content: await (await fetch(SKRIPT_SYNTAX)).text()
            }
        }
    });

    const grammars = new Map();
    grammars.set("skript", "source.skript");

    monaco.languages.register({
        id: 'skript',
        extensions: ['.sk'],
    });

    await wireTmGrammars(monaco, registry, grammars, editor);
}
