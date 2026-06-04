import * as React from "react";
import * as ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import MonacoEditor from "./MonacoEditor";
import TextEditor from "./TextEditor";

ReactDOM.createRoot(document.getElementById("root")).render(
    <TextEditor EditorComponent={MonacoEditor} />,
);
