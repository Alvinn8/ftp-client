import * as React from "react";
import { NbtList, NbtString, NumberNbtTag } from "../../../nbt/nbtTags";
import { NbtIndex } from "./nbtParts";
import NbtTagComponent from "./NbtTagComponent";

interface NbtListComponentProps {
    tag: NbtList;
}

interface NbtListComponentState {
    open: boolean;
}

export default class NbtListComponent extends React.Component<NbtListComponentProps, NbtListComponentState> {
    state = {
        open: false
    };

    render(): React.ReactNode {
        let emptyText;
        if (this.props.tag.data.length <= 0) {
            emptyText = <span style={{ "font-style": "italic" }}>empty list</span>;
        }
        return (
            <div className="text-nowrap" style={{ "margin-left": "-24px" }}>
                <div className="d-inline-block p-1 folder-component-arrow" onClick={this.toggleOpen.bind(this)}>
                    <i className={"bi bi-chevron-" + (this.state.open ? "down" : "right")}></i>
                </div>
                {this.props.children}
                {!this.state.open && emptyText != null && (
                    <>
                        <span>: </span>
                        {emptyText}
                    </>
                )}
                {!this.state.open
                    && emptyText == null
                    && this.props.tag.data.length < 5
                    && (this.props.tag.data[0] instanceof NumberNbtTag
                        || this.props.tag.data[0] instanceof NbtString)
                    && (
                        <>
                            <span>: [ </span>
                            {this.props.tag.data.map((tag, index) => (
                                <>
                                    {index > 0 && ", "}
                                    <NbtTagComponent tag={tag} key={index} />
                                </>
                            ))}
                            <span> ] </span>
                        </>
                )}
                {this.state.open && (
                    <div className="ms-4">
                        {this.props.tag.data.map((tag, index) => (
                            <div className="ms-3">
                                <NbtTagComponent tag={tag} key={index}>
                                    <NbtIndex index={index} />
                                </NbtTagComponent>
                            </div>
                        ))}
                        {emptyText != null && (
                            <div className="ms-3">
                                {emptyText}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    toggleOpen() {
        this.setState({
            ...this.state,
            open: !this.state.open
        });
    }
}