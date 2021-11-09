import * as React from "react";

interface TextEditorProps {
    text: string;
    filePath: string;
}

export default class TextEditor extends React.Component<TextEditorProps, {}> {
    render() {
        return <pre>{this.props.text}</pre>;
    }
}