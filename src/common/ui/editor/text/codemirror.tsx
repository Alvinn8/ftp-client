import * as React from "react";
import * as ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import TextEditor from "./TextEditor";
import CodeMirrorEditor from "./CodeMirrorEditor";

ReactDOM.createRoot(document.getElementById("root")).render(
    <TextEditor EditorComponent={CodeMirrorEditor} />
);