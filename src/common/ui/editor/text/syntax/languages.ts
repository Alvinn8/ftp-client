/**
 * A language that Monaco does not support out of the box and that is
 * highlighted using a TextMate grammar instead.
 */
export interface TextMateLanguage {
    id: string;
    extension: string;
    scopeName: string;
    grammarUrl: string;
}

export const TEXTMATE_LANGUAGES: TextMateLanguage[] = [
    {
        id: "skript",
        extension: ".sk",
        scopeName: "source.skript",
        grammarUrl:
            "https://cdn.jsdelivr.net/gh/AyhamAl-Ali/Sk-VSC@2.6.5/src/syntaxes/Sk-VSC.json",
    },
    {
        id: "mcfunction",
        extension: ".mcfunction",
        scopeName: "source.mcfunction",
        grammarUrl:
            "https://cdn.jsdelivr.net/gh/MinecraftCommands/syntax-mcfunction@1.0.1/mcfunction.tmLanguage.json",
    },
    {
        id: "toml",
        extension: ".toml",
        scopeName: "source.toml",
        grammarUrl:
            "https://cdn.jsdelivr.net/gh/oovm/vscode-toml@e9edfdb18ae75c573525f53e0ba986118457b5d5/extension/toml.tmLanguage.json",
    },
    {
        id: "json5",
        extension: ".json5",
        scopeName: "source.json5",
        grammarUrl:
            "https://cdn.jsdelivr.net/gh/mrmlnc/vscode-json5@1.0.0/syntaxes/json5.json",
    },
];

/**
 * Find the TextMate language to use for the file, if any.
 *
 * @param path The path or name of the file.
 * @returns The language, or undefined if Monaco should handle the file itself.
 */
export function findTextMateLanguage(
    path: string,
): TextMateLanguage | undefined {
    return TEXTMATE_LANGUAGES.find((language) =>
        path.endsWith(language.extension),
    );
}
