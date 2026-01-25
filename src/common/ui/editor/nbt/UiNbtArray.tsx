import * as React from "react";
import { ArrayNbtTag, NbtByteArray, NbtIntArray, NbtLongArray } from "../../../nbt/nbtTags";

interface UiNbtArrayProps {
    tag: ArrayNbtTag;
    children?: React.ReactNode;
}

export default class UiNbtArray extends React.Component<UiNbtArrayProps, {}> {
    render() {
        const length = this.props.tag.length();
        const type = getType(this.props.tag);
        return <>
            {this.props.children != null && (
                <span>
                    {this.props.children}
                    <span>{": array of " + length + " " + type + (length == 1 ? "" : "s")}</span>
                </span>
            )}
        </>
    }
}

function getType(tag: ArrayNbtTag) {
    if (tag instanceof NbtByteArray) return "byte";
    if (tag instanceof NbtIntArray) return "int";
    if (tag instanceof NbtLongArray) return "long";
    return "value";
}
