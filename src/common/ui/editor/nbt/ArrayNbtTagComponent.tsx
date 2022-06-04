import * as React from "react";
import { ArrayNbtTag } from "../../../nbt/nbtTags";

interface ArrayNbtTagComponentProps {
    tag: ArrayNbtTag;
}

export default class ArrayNbtTagComponent extends React.Component<ArrayNbtTagComponentProps, {}> {
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