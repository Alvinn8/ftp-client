import React, { useEffect, useRef, useState } from "react";
import EditorControls from "./EditorControls";
import "./ImageEditor.css";

const ImageEditor: React.FC = () => {
    const ref = useRef<HTMLImageElement>(null);
    const [dimensions, setDimensions] = useState("");
    
    const url = window["imageEditorData"].url;

    useEffect(() => {
        if (!ref.current) return;

        ref.current.addEventListener("load", () => {
            setDimensions(ref.current.naturalWidth + "x" + ref.current.naturalHeight);
        });
    }, [ref.current]);

    useEffect(() => {
        document.title = window["imageEditorData"].title;
    }, []);

    return (
        <div className="image-editor-container">
            <img src={url} ref={ref} className="image" />
            <p>{`Image size: ${dimensions}`}</p>
            <EditorControls allowSaving={false} />
        </div>
    );
};

export default ImageEditor;