/// <reference types="vitest" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [ react() ],
    server: {
        host: true,
        port: 3000
    },
    preview: {
        host: true,
        port: 4173
    },
    test: {
        environment: "jsdom",
        globals: true,
        open: false,
        setupFiles: "./src/common/test/setup.ts"
    }
});