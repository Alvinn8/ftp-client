import * as React from "react";
import { NbtList, NbtString, NumberNbtTag } from "../../../nbt/nbtTags";
import { UiNbtIndex } from "./nbtParts";
import NbtTagContainer from "./NbtTagContainer";
import UiNbtTag from "./UiNbtTag";

interface UiNbtListProps {
    tag: NbtList;
}

interface UiNbtListState {
    open: boolean;
}

export default class UiNbtList extends React.Component<UiNbtListProps, UiNbtListState> {
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
                <div className="d-inline-block p-1 arrow" onClick={this.toggleOpen.bind(this)}>
                    <i className={"bi bi-chevron-" + (this.state.open ? "down" : "right")}></i>
                </div>
                {this.props.children != null && (
                    <NbtTagContainer label={null}>
                        {this.props.children}
                    </NbtTagContainer>
                )}
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
                                    <UiNbtTag tag={tag} key={index} />
                                </>
                            ))}
                            <span> ] </span>
                        </>
                )}
                {this.state.open && (
                    <div className="ms-4">
                        {this.props.tag.data.map((tag, index) => (
                            <div className="ms-3">
                                <UiNbtTag tag={tag} key={index}>
                                    <UiNbtIndex index={index} />
                                </UiNbtTag>
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