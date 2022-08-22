import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { App } from "./App";

async function loadBootstrap() {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    // Typescript does not understand dynamic imports with css, so we use @ts-ignore
    if (isDarkMode) {
        // @ts-ignore
        await import("@forevolve/bootstrap-dark/dist/css/bootstrap-dark.min.css");
    } else {
        // @ts-ignore
        await import("bootstrap/dist/css/bootstrap.min.css");
    }
}

loadBootstrap().then(() => {
    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
});
