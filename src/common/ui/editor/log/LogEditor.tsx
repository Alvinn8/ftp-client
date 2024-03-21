import React, { useEffect, useState } from "react";
import EditorControls from "../EditorControls";
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

type LogLevel = "error" | "error-stacktrace" | "warning";

interface Line {
    text: JSX.Element;
    level?: LogLevel;
}

const SECTION_COLOR = "§";
const UNKNOWN_COLOR = "?";
const ANSI_START_CHAR = "";
const ANSI_COLOR_REGEX = /\[(?<a>\d+);(?<b>\d+)m\[/;

function parseLogs(text: string): Line[] {
    const forge = isForge(text);

    const result = [];
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const current = lines[i];
        const line: Line = {
            text: formatLine(current, forge),
        };
        const currentLower = current.toLowerCase();
        if (/at ([a-zA-Z0-9\.<>_$]+)\(.+\)/.exec(currentLower)) {
            line.level = "error-stacktrace";
        } else if (["error", "severe", "exception", "caused by"].some(word => currentLower.includes(word))) {
            line.level = "error";
        } else if (currentLower.includes("warn")) {
            line.level = "warning";
        }
        
        result.push(line);
    }
    return result;
}

function isForge(text: string): boolean {
    return text.includes("Forge") || text.includes("forge");
}

function className(line: Line): string {
    let className = "line";
    if (line.level) {
        className += " line-" + line.level;
    }
    return className;
}

const COLOR_CODES = {
    '0': '#000000',
    '1': '#0000aa',
    '2': '#00aa00',
    '3': '#00aaaa',
    '4': '#aa0000',
    '5': '#aa00aa',
    '6': '#ffaa00',
    '7': '#aaaaaa',
    '8': '#555555',
    '9': '#5555ff',
    'a': '#55ff55',
    'b': '#55ffff',
    'c': '#ff5555',
    'd': '#ff55ff',
    'e': '#ffff55',
    'f': '#ffffff',
};
const FORMATTING_CODES = {
    'l': 'bold',
    'm': 'striketrough',
    'n': 'underline',
    'o': 'italic',
};
const RESET_CODE = 'r';

function formatLine(text: string, isForge: boolean): JSX.Element {
    if (!text.includes(SECTION_COLOR) && !ANSI_COLOR_REGEX.exec(text) && (!isForge || !text.includes(UNKNOWN_COLOR))) {
        return <>{ text }</>;
    }
    // Perform color codes.
    const parts = [];
    let color = null;
    let formatting = [];
    let save = 0;
    let cursor = 0;
    let key = 0;
    function savePart(skip: number) {
        const partText = text.substring(save, cursor);
        cursor += skip - 1;
        const style = {
            color
        };
        const className = formatting.map(f => 'line-format-' + f).join(' ');
        parts.push(
            <span
                className={className}
                style={style}
                key={key++}
            >{partText}</span>
        );
        save = cursor + 1;
    }
    while (cursor < text.length) {
        const sub1 = text.substring(cursor, cursor + 1);
        if (sub1 == SECTION_COLOR || (isForge && sub1 == UNKNOWN_COLOR)) {
            const colorChar = text.charAt(cursor + 1);
            const newColor = COLOR_CODES[colorChar];
            const newFormatting = FORMATTING_CODES[colorChar];
            if (newColor) {
                savePart(2);
                color = newColor;
                formatting = [];
            } else if (newFormatting) {
                savePart(2);
                formatting.push(newFormatting);
            } else if (colorChar === RESET_CODE) {
                savePart(2);
                color = null;
                formatting = [];
            }
        }/* else if (sub1 == ANSI_START_CHAR) {
            const sub2 = text.substring(cursor, 7);
            const ansi = ANSI_COLOR_REGEX.exec(sub2);
            if (ansi) {
                color = 'lime';
                savePart(ansi[0].length);
            }
        }*/
        cursor++;
    }
    // Save last part
    savePart(0);
    return <>{ parts }</>;
}

export default LogEditor;