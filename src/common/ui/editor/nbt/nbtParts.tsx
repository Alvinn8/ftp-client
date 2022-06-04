import * as React from "react";

export function NbtKey(props: { name: string }) {
    return <span style={{ "color": "#2bc3c3" }}>{props.name}</span>;
}

export function NbtIndex(props: { index: number }) {
    return <span style={{ "color": "#2bc3c3" }}>{props.index.toString()}</span>;
}

export function NbtNumberComponent(props: { value: string, type: string }) {
    return <>
        <NbtNumberValue value={props.value} />
        <NbtNumberType type={props.type} />
    </>;
}

function NbtNumberValue(props: { value: string }) {
    return <span style={{ "color": "#efb930", "font-weight": 600 }}>{props.value}</span>;
}

function NbtNumberType(props: { type: string }) {
    return <span style={{ "color": "#f06666" }}>{props.type}</span>;
}

export function NbtStringComponent(props: { value: string }) {
    let escapedString = JSON.stringify(props.value);
    escapedString = escapedString.substring(1); // Remove first "
    escapedString = escapedString.substring(0, escapedString.length - 1); // remove last "
    let suffix;
    const length = escapedString.length;
    if (length > 50) {
        escapedString = escapedString.substring(0, 40);
        suffix = " ... and " + (length - 40) + " more characters";
    }
    return <>
        <span>"</span>
        <span style={{ "color": "#4bb54b" }}>{escapedString}</span>
        {suffix != null && (
            <span style={{ "color": "#4bb54b", "font-style": "italic" }}>{suffix}</span>
        )}
        <span>"</span>
    </>;
}