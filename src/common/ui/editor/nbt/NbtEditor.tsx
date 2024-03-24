import React, { useEffect, useState } from "react";
import NbtData from "../../../nbt/NbtData";
import EditorControls from "../EditorControls";
import UiNbtTag from "./UiNbtTag";
import "./NbtEditor.css";
import { readNbt, writeNbt } from "../../../nbt/nbt";

const NbtEditor = () => {
    const [nbt, setNbt] = useState<NbtData>(null);
    const [allowSaving, setAllowSaving] = useState(false);

    useEffect(() => {
        const data = window["nbtEditorData"];
        if (!data) {
            window.close();
        }
        const read = async () => {
            setNbt(await readNbt(data.blob));
            setAllowSaving(data.allowSaving);
        };
        read();
        document.title = data.title;
    }, []);

    const handleSave = async () => {
        // Call save function created by editor.tsx
        const blob = await writeNbt(nbt);
        window["save"](blob);
    };

    if (!nbt) return <p>Loading...</p>;

    return (
        <div className="grid">
            <div className="ms-5 nbt-editor">
                <UiNbtTag tag={nbt.tag} root={true} />
            </div>
            <div className="editor-controls">
                <EditorControls allowSaving={allowSaving && false} onSave={handleSave} />
            </div>
        </div>
    );
};

export default NbtEditor;