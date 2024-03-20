import React, { useEffect, useState } from "react";
import EditorControls from "./EditorControls";
import "./LogEditor.css";

const LogEditor: React.FC = () => {
    const [lines, setLines] = useState<Line[] | null>(null);

    useEffect(() => {
        const data = window["logEditorData"];
        document.title = data.title;
        setLines(parseLogs(data.text));
    }, []);

    const controls = (
        <div className="controls">
            <EditorControls allowSaving={false} />
        </div>
    );

    if (!lines) {
        return (
            <div>
                <p>Loading...</p>
                 { controls }
            </div>
        );
    }

    return (
        <div>
            <div className="logs">
                { lines.map(line => {
                    return <span className={className(line)}>{ line.text }</span>
                }) }
            </div>
            { controls }
        </div>
    );
};

type LogLevel = "error" | "warning";

interface Line {
    text: string;
    level?: LogLevel;
}

function parseLogs(text: string): Line[] {
    const result = [];
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const current = lines[i];
        const line: Line = {
            text: current,
        };
        const currentUpper = current.toUpperCase();
        if (currentUpper.includes("WARN")) {
            line.level = "warning";
        } else if (currentUpper.includes("ERROR") || currentUpper.includes("SEVERE")) {
            line.level = "error";
        }
        
        result.push(line);
    }
    return result;
}

function className(line: Line): string {
    let className = "line";
    if (line.level) {
        className += " line-" + line.level;
    }
    return className;
}

export default LogEditor;