import { setupTextMate } from "./textmate";
import { Registry } from "monaco-textmate";
import * as monaco from "monaco-editor";
import { wireTmGrammars } from 'monaco-editor-textmate'

const MCFUNCTION_SYNTAX = "https://cdn.jsdelivr.net/gh/MinecraftCommands/syntax-mcfunction@1.0.1/mcfunction.tmLanguage.json";

export async function registerMcfunctionLanguage(editor: monaco.editor.IStandaloneCodeEditor) {
    await setupTextMate();

    const registry = new Registry({
        getGrammarDefinition: async (scopeName) => {
            return {
                format: 'json',
                content: await (await fetch(MCFUNCTION_SYNTAX)).text()
            }
        }
    });

    const grammars = new Map();
    grammars.set("mcfunction", "source.mcfunction");

    monaco.languages.register({
        id: 'mcfunction',
        extensions: ['.mcfunction'],
    });

    await wireTmGrammars(monaco, registry, grammars, editor);
}
