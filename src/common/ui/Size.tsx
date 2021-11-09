import * as React from "react";

/**
 * A component rendering a file size in bytes. Will choose a fitting prefix and
 * display the unit (B). Will also have a hoverable title for the exact size.
 *
 * @param props The props containing the size.
 */
export default function Size(props: { size: number }) {
    const text = getText(props.size);
    return <span title={props.size + " byte" + (props.size == 1 ? "" : "s")}>{ text }</span>;
}

function getText(size: number) {
    if (size > 10**9) {
        return (size / 10 ** 9).toFixed(2) + " GB";
    }
    if (size > 10**6) {
        return (size / 10 ** 6).toFixed(2) + " MB";
    }
    if (size > 1000) {
        return (size / 1000).toFixed(2) + " kB";
    }
    return size + " B";
}