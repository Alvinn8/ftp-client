// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

export default tseslint.config(
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
        rules: {
            // Rules to ensure promises are handled with care to avoid uncaught rejections.
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "prefer-promise-reject-errors": "off", // disable eslint variant because the tslint one is better
            "@typescript-eslint/prefer-promise-reject-errors": "error",
            "@typescript-eslint/promise-function-async": "error",
            "require-await": "off", // disable eslint variant because the tslint one is better
            "@typescript-eslint/require-await": "error",
            "@typescript-eslint/return-await": "error"
        }
    }
);
