import * as React from "react";
import { ArrayNbtTag } from "../../../nbt/nbtTags";

interface UiNbtArrayProps {
    tag: ArrayNbtTag;
}

export default class UiNbtArray extends React.Component<UiNbtArrayProps, {}> {
    render() {
        const length = this.props.tag.length();
        // todo: say bytes/ints/longs instead of values
        // todo: a way of viewing the values
        return <>
            {this.props.children != null && (
                <span>{this.props.children}{": " + length + " " + (length == 1 ? "value" : "values")}</span>
            )}
        </>
    }
}