import React, { useEffect, useState } from "react";
import EditorControls from "../EditorControls";
import "./LogEditor.css";

const LogEditor: React.FC = () => {
    const [lines, setLines] = useState<Line[] | null>(null);

    useEffect(() => {
        const data = window["logEditorData"];
        if (!data) {
            window.close();
        }
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
                { lines.map((line, index) => {
                    return <span className={className(line)} key={index}>{ line.text }</span>
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

function parseLogs(text: string): Line[] {
    const result = [];
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const current = lines[i];
        const line: Line = {
            text: formatLine(current),
        };
        const currentLower = current.toLowerCase();

        const errorKeywords = ["error", "severe", "exception", "caused by"];
        const errorIndices = errorKeywords
            .map(word => currentLower.indexOf(word))
            .filter(idx => idx !== -1);
        const firstErrorIdx = errorIndices.length > 0 ? Math.min(...errorIndices) : -1;
        const warnIdx = currentLower.indexOf("warn");

        if (/(^|\s)at ([ a-zA-Z0-9\.<>_\-$/@^#\\]+)\(.+\)/.exec(currentLower)) {
            line.level = "error-stacktrace";
        } else if (warnIdx !== -1 && (firstErrorIdx === -1 || warnIdx < firstErrorIdx)) {
            line.level = "warning";
        } else if (firstErrorIdx !== -1) {
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

const SECTION_COLOR = "§";
const UNKNOWN_COLOR = "?";

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

const ANSI_START_CHAR = "\u001b";
const ANSI_COLOR_REGEX = /\u001b\[[0-9;]*m/;
const ANSI_COLORS = {
    '30': '#000000',
    '31': '#ff5555',
    '32': '#55ff55',
    '33': '#ffff55',
    '34': '#5555ff',
    '35': '#ff55ff',
    '36': '#55ffff',
    '37': '#ffffff',
    '39': 'unset', // default color
};
const ANSI_FORMATTING = {
    '1': 'bold',
    '3': 'italic',
    '4': 'underline',
    '9': 'striketrough',
};
const ANSI_REMOVE_FORMATTING = {
    '22': 'bold',
    '23': 'italic',
    '24': 'underline',
    '29': 'striketrough',
};
const ANSI_RESET = 0;

function formatLine(text: string): JSX.Element {
    if (!text.includes(SECTION_COLOR) && !ANSI_COLOR_REGEX.exec(text) && !text.includes(UNKNOWN_COLOR)) {
        return <>{ text }</>;
    }
    // This line contains color codes or ANSI codes, parse color.
    
    // Create reader for line
    const reader = makeReader(text);
    
    // Current color and formatting.
    let color = null;
    const formatting = new Set();
    
    // Line parts
    const parts = [];
    function savePart(skip: number) {
        const partText = reader.save(skip);

        const className = [...formatting.values()].map(f => 'line-format-' + f).join(' ');
        parts.push(
            <span
                className={className}
                style={{ color }}
                key={parts.length}
            >{partText}</span>
        );
    }

    // Read line.
    while (reader.canRead()) {
        const char = reader.read();

        // Minecraft formatting/color codes
        if (char == SECTION_COLOR || char == UNKNOWN_COLOR) {
            const colorChar = reader.read();
            const newColor = COLOR_CODES[colorChar];
            const newFormatting = FORMATTING_CODES[colorChar];
            if (newColor) {
                savePart(2);
                color = newColor;
                formatting.clear();
            } else if (newFormatting) {
                savePart(2);
                formatting.add(newFormatting);
            } else if (colorChar === RESET_CODE) {
                savePart(2);
                color = null;
                formatting.clear();
            } else {
                // This was apparantly not a color or formatting code,
                // undo the read.
                reader.back();
            }
        }
        
        // ANSI Control Codes
        else if (char == ANSI_START_CHAR && reader.peek() == '[') {
            let start = reader.cursor() - 1;
            reader.skip();
            const codes = [];
            while (reader.canRead() && reader.peek() !== 'm') {
                codes.push(reader.readInt());
                if (reader.peek() === ';') {
                    reader.skip();
                }
            }
            reader.skip(); // skip 'm'
            let len = reader.cursor() - start;
            savePart(len);
            for (const code of codes) {
                const newColor = ANSI_COLORS[code];
                const newFormatting = ANSI_FORMATTING[code];
                const removeFormatting = ANSI_REMOVE_FORMATTING[code];
                if (newColor) {
                    color = newColor;
                    formatting.clear();
                } else if (newFormatting) {
                    formatting.add(newFormatting);
                } else if (removeFormatting) {
                    formatting.delete(removeFormatting);
                } else if (code == ANSI_RESET) {
                    color = null;
                    formatting.clear();
                } else {
                    // Skip unknown codes.
                    console.log(code);
                }
            }
        }
    }
    
    // Save last part and return the parts
    savePart(0);
    return <>{ parts }</>;
}

interface Reader {
    read(): string;
    peek(): string;
    skip(): void;
    back(): void;
    canRead(): boolean;
    save(skip: number): string;
    cursor(): number;
    readInt(): number;
}

function makeReader(text: string): Reader {
    let cursor = 0;
    let save = 0;
    return {
        read() { return text.charAt(cursor++); },
        peek() { return text.charAt(cursor) },
        canRead() { return cursor < text.length; },
        cursor() { return cursor; },
        skip() { cursor++; },
        back() { cursor--; },
        save(skip: number) {
            let str = text.substring(save, cursor - skip);
            save = cursor;
            return str;
        },
        readInt: function() {
            let str = "";
            while (this.canRead() && isDigit(this.peek())) {
                str += this.read();
            }
            return parseInt(str);
        },
    };
}

function isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
}

export default LogEditor;