import * as React from "react";
import * as ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import MonacoEditor2 from "./MonacoEditor2";
import TextEditor2 from "./TextEditor2";

ReactDOM.createRoot(document.getElementById("root")).render(
    <TextEditor2 allowSaving={true} EditorComponent={MonacoEditor2} />
);