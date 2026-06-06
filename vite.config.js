/// <reference types="vitest" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: "./",
    server: {
        host: true,
        port: 3000,
    },
    preview: {
        host: true,
        port: 4173,
    },
    test: {
        environment: "happy-dom",
        globals: true,
        open: false,
        setupFiles: "./src/common/test/setup.ts",
    },
    resolve: {
        alias: {
            "@common": resolve(__dirname, "src", "common"),
            "@protocol": resolve(__dirname, "src", "protocol"),
            "@web": resolve(__dirname, "src", "web"),
            "@server": resolve(__dirname, "src", "server"),
        },
    },
    define: {
        "import.meta.env.VERSION": JSON.stringify(
            process.env.npm_package_version,
        ),
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                monacoTextEditor: resolve(
                    __dirname,
                    "editor",
                    "text",
                    "monaco.html",
                ),
                codemirrorTextEditor: resolve(
                    __dirname,
                    "editor",
                    "text",
                    "codemirror.html",
                ),
                imageEditor: resolve(__dirname, "editor", "image.html"),
                nbtEditor: resolve(__dirname, "editor", "nbt.html"),
                logEditor: resolve(__dirname, "editor", "log.html"),
            },
        },
    },
});
