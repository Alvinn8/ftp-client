import * as React from "react";
import { ArrayNbtTag, NbtCompound, NbtList, NbtString, NbtTag, NumberNbtTag } from "../../../nbt/nbtTags";
import UiNbtArray from "./UiNbtArray";
import UiNbtCompound from "./UiNbtCompound";
import UiNbtList from "./UiNbtList";
import { UiNbtNumberComponent, UiNbtString } from "./nbtParts";
import NbtTagContainer from "./NbtTagContainer";
import { contextMenuForString, contextMenuForNumber, contextMenuForArray, ParentData } from "./nbtContextMenu";
interface Props {
    tag: NbtTag;
    root: boolean;
    parent: ParentData;
}

export default class UiNbtTag extends React.Component<Props, {}> {
    render() {
        const reRenderUi = this.forceUpdate.bind(this);
        const tag = this.props.tag;
        if (tag instanceof NbtCompound) {
            return (
                <UiNbtCompound nbtCompound={tag} root={this.props.root} parent={this.props.parent}>
                    {this.props.children}
                </UiNbtCompound>
            );
        }
        if (tag instanceof NbtList) {
            return (
                <UiNbtList tag={tag} parent={this.props.parent}>
                    {this.props.children}
                </UiNbtList>
            );
        }
        if (tag instanceof NumberNbtTag) {
            return (
                <NbtTagContainer label={this.props.children} populator={contextMenuForNumber(tag, this.props.parent, reRenderUi)}>
                    <UiNbtNumberComponent value={tag.toString()} type={tag.getTypeChar()} />
                </NbtTagContainer>
            );
        }
        if (tag instanceof NbtString) {
            return (
                <NbtTagContainer label={this.props.children} populator={contextMenuForString(tag, this.props.parent, reRenderUi)}>
                    <UiNbtString value={tag.value} />
                </NbtTagContainer>
            );
        }
        if (tag instanceof ArrayNbtTag) {
            return (
                <NbtTagContainer label={null} populator={contextMenuForArray(tag, this.props.parent, reRenderUi)}>
                    <UiNbtArray tag={tag}>
                        {this.props.children}
                    </UiNbtArray>
                </NbtTagContainer>
            );
        }
        return <span className="tag-container">
            {this.props.children}
            <span>: Unknown tag: {tag.constructor.name}</span>
        </span>;
    }
}