import * as React from "react";
import { formatByteSize } from "../utils";

/**
 * A component rendering a file size in bytes. Will choose a fitting prefix and
 * display the unit (B). Will also have a hoverable title for the exact size.
 *
 * @param props The props containing the size.
 */
export default function Size(props: { size: number; fractionDigits?: number }) {
    const text = formatByteSize(props.size, props.fractionDigits);
    return (
        <span title={props.size + " byte" + (props.size == 1 ? "" : "s")}>
            {text}
        </span>
    );
}
