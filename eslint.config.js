// @ts-check

import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginSayari from "@sayari/eslint-plugin";
import pluginPath from "eslint-plugin-path";
import pluginImport from "eslint-plugin-import";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default defineConfig(
    // Eventually we would want to enable all these. But it would involve a lot of cleanup.
    // eslint.configs.recommended,
    // tseslint.configs.recommended,
    // pluginReact.configs.recommended,
    pluginReact.configs.flat["jsx-runtime"],
    tseslint.configs.base,
    {
        files: ["src/**/*.ts", "src/**/*.tsx"],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            // @ts-ignore
            "@sayari": pluginSayari,
            // @ts-ignore
            path: pluginPath,
            import: pluginImport,
            "unused-imports": pluginUnusedImports,
        },
        settings: {
            "import/resolver": {
                typescript: {
                    project: "./tsconfig.json",
                },
            },
        },
        rules: {
            // Rules to ensure promises are handled with care to avoid uncaught rejections.
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "prefer-promise-reject-errors": "off", // disable eslint variant because the tslint one is better
            "@typescript-eslint/prefer-promise-reject-errors": "error",
            "@typescript-eslint/promise-function-async": "error",
            "require-await": "off", // disable eslint variant because the tslint one is better
            "@typescript-eslint/require-await": "error",
            "@typescript-eslint/return-await": ["error", "always"],
            "@typescript-eslint/await-thenable": "error",
            "no-async-promise-executor": "error",
            "path/no-relative-imports": ["error", { maxDepth: 0 }],
            "unused-imports/no-unused-imports": "error",
            // Rule to ensure text is wrapped to avoid errors when users use Google
            // translate that manipulate the DOM.
            "@sayari/no-unwrapped-jsx-text": "error",
            // Prevent importing from a forbidden module
            "import/no-restricted-paths": [
                "error",
                {
                    zones: [
                        {
                            target: "./src/common",
                            from: "./src/server",
                            message:
                                "Frontend code cannot import backend code.",
                        },
                        {
                            target: "./src/web",
                            from: "./src/server",
                            message:
                                "Frontend code cannot import backend code.",
                        },
                        {
                            target: "./src/server",
                            from: ["./src/web", "./src/common"],
                            message:
                                "Backend code cannot import frontend code.",
                        },
                        {
                            target: "./src/protocol",
                            from: ["./src/web", "./src/server", "./src/common"],
                            message:
                                "Protocol code cannot import frontend or backend code.",
                        },
                    ],
                },
            ],
        },
    },
);
