import * as React from "react";
import { ArrayNbtTag, NbtCompound, NbtList, NbtString, NbtTag, NumberNbtTag } from "../../../nbt/nbtTags";
import ArrayNbtTagComponent from "./ArrayNbtTagComponent";
import NbtCompoundComponent from "./NbtCompoundComponent";
import NbtListComponent from "./NbtListComponent";
import { NbtNumberComponent, NbtStringComponent } from "./nbtParts";

interface Props {
    tag: NbtTag;
}

export default class NbtTagComponent extends React.Component<Props, {}> {
    render() {
        const tag = this.props.tag;
        if (tag instanceof NbtCompound) {
            return (
                <NbtCompoundComponent nbtCompound={tag}>
                    {this.props.children}
                </NbtCompoundComponent>
            );
        }
        if (tag instanceof NbtList) {
            return (
                <NbtListComponent tag={tag}>
                    {this.props.children}
                </NbtListComponent>
            );
        }
        if (tag instanceof NumberNbtTag) {
            return (
                <>
                    {this.props.children != null && (
                        <span>{this.props.children}: </span>
                    )}
                    <NbtNumberComponent value={tag.toString()} type={tag.getTypeChar()} />
                </>
            );
        }
        if (tag instanceof NbtString) {
            return (
                <>
                    {this.props.children != null && (
                        <span>{this.props.children}: </span>
                    )}
                    <NbtStringComponent value={tag.value} />
                </>
            );
        }
        if (tag instanceof ArrayNbtTag) {
            return <ArrayNbtTagComponent tag={tag}>
                {this.props.children}
            </ArrayNbtTagComponent>
        }
        return <span>
            {this.props.children}
            <span>: Unknown tag: {tag.constructor.name}</span>
        </span>;
    }
}