import React, { useEffect, useState } from "react";
import NbtData, { BedrockEdition, BedrockLevelDat } from "../../../nbt/NbtData";
import EditorControls from "../EditorControls";
import UiNbtTag from "./UiNbtTag";
import "./NbtEditor.css";
import { readNbt, sanityCheckNbt, writeNbt } from "../../../nbt/nbt";
import Dialog from "../../../Dialog";
import { formatError, unexpectedErrorHandler } from "../../../error";

const NbtEditor = () => {
    const [nbt, setNbt] = useState<NbtData>(null);
    const [allowSaving, setAllowSaving] = useState(false);

    useEffect(() => {
        const data = window["nbtEditorData"];
        if (!data) {
            window.close();
            return;
        }
        console.log(data.editionData);
        const read = async () => {
            setNbt(await readNbt(data.blob));
            setAllowSaving(data.allowSaving);
        };
        read().catch(unexpectedErrorHandler("Failed to Read NBT"));
        document.title = data.title;
    }, []);

    const handleSave = () => {
        // Call save function created by editor.tsx
        const blob = writeNbt(nbt);
        // Sanity check that the written file is valid.
        sanityCheckNbt(blob, nbt).then(() => {
            window["save"](blob);
        }).catch((err) => {
            Dialog.message("Error", "Failed to save NBT file. Please contact support if you wish to modify this file. " + formatError(err));
        });
    };

    if (!nbt) return <p>Loading...</p>;

    const bedrockLevelDat = nbt.editionData.edition === "bedrock" && (nbt.editionData as BedrockEdition).isLevelDat;

    return (
        <div className="grid">
            <div className="ms-5 nbt-editor">
                <div className="mb-2">
                    <span className="badge bg-secondary mt-3">{editionText(nbt)}</span>
                    {!allowSaving && (
                        <div className="text-bg-warning rounded p-2 my-3" style={{ maxWidth: "400px", fontSize: "0.75em" }}>This NBT file cannot be modified and saved. Please contact support if you wish to modify this file.</div>
                    )}
                </div>
                <UiNbtTag tag={nbt.tag} root={true} parent={null} bedrockLevelDat={bedrockLevelDat} />
            </div>
            <div className="editor-controls">
                <EditorControls allowSaving={allowSaving} onSave={handleSave} />
            </div>
        </div>
    );
};

function editionText(nbtData: NbtData) {
    let txt = nbtData.editionData.edition === "java" ? "Java Edition" : "Bedrock Edition";
    if (nbtData.editionData.edition === "bedrock" && (nbtData.editionData as BedrockEdition).isLevelDat) {
        txt += " level.dat version " + (nbtData.editionData as BedrockLevelDat).headerVersion;
    } else {
        txt += " NBT";
    }
    if (nbtData.compression != null) {
        if (nbtData.compression.type === "gzip") {
            txt += " (gzipped)";
        } else if (nbtData.compression.type === "zlib") {
            txt += " (zlib encoded)";
        }
    }
    return txt;
}

export default NbtEditor;