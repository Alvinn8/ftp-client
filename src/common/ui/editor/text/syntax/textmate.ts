import { loadWASM } from "onigasm";
// @ts-ignore
import wasmURL from "onigasm/lib/onigasm.wasm?url";
import { Registry } from "monaco-textmate";
import * as monaco from "monaco-editor";
import { wireTmGrammars } from "monaco-editor-textmate";
import { TEXTMATE_LANGUAGES, TextMateLanguage } from "./languages";

let wasmLoaded: Promise<void> | null = null;

// onigasm throws if the WASM is loaded more than once.
async function setupTextMate(): Promise<void> {
    if (!wasmLoaded) {
        wasmLoaded = loadWASM(wasmURL);
    }
    return await wasmLoaded;
}

const registry = new Registry({
    getGrammarDefinition: async (scopeName) => {
        const language = TEXTMATE_LANGUAGES.find(
            (language) => language.scopeName === scopeName,
        );
        if (!language) {
            throw new Error("No TextMate grammar for scope " + scopeName);
        }
        return {
            format: "json",
            content: await (await fetch(language.grammarUrl)).text(),
        };
    },
});

/**
 * Register syntax highlighting for the language using its TextMate grammar.
 *
 * @param language The language to register.
 * @param editor The editor to highlight.
 */
export async function registerTextMateLanguage(
    language: TextMateLanguage,
    editor: monaco.editor.IStandaloneCodeEditor,
) {
    await setupTextMate();

    if (!monaco.languages.getLanguages().some((l) => l.id === language.id)) {
        monaco.languages.register({
            id: language.id,
            extensions: [language.extension],
        });
    }

    const grammars = new Map([[language.id, language.scopeName]]);
    await wireTmGrammars(monaco, registry, grammars, editor);
}
