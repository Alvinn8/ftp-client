import React, { useCallback, useRef } from "react";
import ReactCodeMirror from "@uiw/react-codemirror";
import { TextEditorData } from "./TextEditor";
import { isDarkTheme } from "../../theme";

const CodeMirrorEditor: React.FC<TextEditorData> = ({ text, valueProvider }) => {
    const valueRef = useRef<string>(text);

    const onChange = useCallback((value) => {
        valueRef.current = value;
    }, []);

    valueProvider.getValue = () => valueRef.current;
    
    return (
        <ReactCodeMirror
            value={text}
            theme={isDarkTheme() ? "dark" : "light"}
            onChange={onChange}
        />
    );
};

export default CodeMirrorEditor;