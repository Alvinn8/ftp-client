import React, { useState } from "react";
import { editorWindowsStore } from "./editor";
import { isDarkTheme } from "../theme";

const OpenEditors = () => {
    const [editorWindows, setEditorWindows] = useState<Window[]>([]);

    editorWindowsStore.on("change", (editorWindows) => {
        setEditorWindows(editorWindows.map(editorWindow => editorWindow.window));
    });

    const openWindows = [...editorWindows].filter(wind => !wind.closed);

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
                        { editorWindow.name }
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default OpenEditors;