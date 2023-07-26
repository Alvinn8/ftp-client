import React, { useState } from "react";
import { isDarkTheme } from "./theme";
import EventEmitter from "eventemitter3";
import Size from "./Size";

export interface LargeFileOperationInterface {
    type: "download" | "upload";
    fileName: string;
    hasProgress: boolean;
    loaded: number;
    total: number;
}

class LargeFileOperationStore extends EventEmitter {
    value: LargeFileOperationInterface;

    setValue(value: LargeFileOperationInterface) {
        this.value = value;
        this.emit("change", this.value);
    }
}
export const largeFileOperationStore = new LargeFileOperationStore();

const LargeFileOperation: React.FC = () => {
    const [value, setValue] = useState<LargeFileOperationInterface>(null);
    
    largeFileOperationStore.on("change", val => setValue(val));

    if (!value) {
        return null;
    }

    const darkThemeClasses = isDarkTheme() ? " bg-secondary text-white" : "";
    const title = (value.type === "download" ? "Downloading " : "Uploading ") + value.fileName;

    return (
        <div className={"card" + darkThemeClasses}>
            <div className="card-header px-3 py-2 bg-primary text-light">
                <span className="card-title">{ title }</span>
            </div>
            <div className="card-body">
                <span style={{fontVariantNumeric: "tabular-nums"}}>
                    <Size size={value.loaded} />
                    <span> / </span>
                    <Size size={value.total} />
                </span>
                {value.hasProgress && (
                    <div className="progress" role="progressbar" aria-valuenow={value.loaded} aria-valuemin={0} aria-valuemax={value.total}>
                        <div className="progress-bar progress-bar-striped progress-bar-animated" style={{width: (value.loaded / value.total) * 100 + "%"}}></div>
                    </div>
                )}
            </div>
        </div>
        );
};

export default LargeFileOperation;