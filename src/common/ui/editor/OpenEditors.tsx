import React, { useState } from "react";
import { editorWindowsStore } from "./editor";
import { isDarkTheme } from "../theme";

const OpenEditors = () => {
    const [editorWindows, setEditorWindows] = useState<Window[]>([]);

    editorWindowsStore.on("change", (editorWindows) => {
        setEditorWindows(editorWindows.map(editorWindow => editorWindow.window));
    });

    function accessWindowVariable<T>(window: Window, varName: string, defaultValue: T): T | undefined {
        try {
            const value = (window as any)[varName];
            return value as T;
        } catch {
            return defaultValue;
        }
    }

    const openWindows = [...editorWindows].filter(wind => !accessWindowVariable(wind, "closed", true));

    if (openWindows.length === 0) {
        return null;
    }

    const darkThemeClasses = isDarkTheme ? " bg-secondary text-white" : "";

    return (
        <div className={"card" + darkThemeClasses}>
            <div className="card-header px-3 py-2 bg-primary text-light">
                <span className="card-title">Open Editors</span>
            </div>
            <ul className="list-group list-group-flush">
                {openWindows.map((editorWindow, index) => (
                    <li key={index} onClick={() => editorWindow.focus()} className={"list-group-item cursor-pointer" + darkThemeClasses}>
                        { accessWindowVariable(editorWindow, "name", "Unnamed Window") }
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default OpenEditors;