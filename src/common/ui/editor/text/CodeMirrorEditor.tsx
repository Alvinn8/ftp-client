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
            style={{ overflow: "hidden" }}
            width="100%"
            height="100%"
        />
    );
};

export default CodeMirrorEditor;