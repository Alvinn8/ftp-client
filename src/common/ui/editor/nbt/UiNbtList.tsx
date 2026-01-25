import * as React from "react";
import { NbtList, NbtString, NumberNbtTag } from "../../../nbt/nbtTags";
import { UiNbtIndex } from "./nbtParts";
import NbtTagContainer from "./NbtTagContainer";
import UiNbtTag from "./UiNbtTag";
import { contextMenuForList, ParentData } from "./nbtContextMenu";
interface UiNbtListProps {
    tag: NbtList;
    parent: ParentData;
    children?: React.ReactNode;
}

interface UiNbtListState {
    open: boolean;
}

export default class UiNbtList extends React.Component<UiNbtListProps, UiNbtListState> {
    state = {
        open: false
    };

    render(): React.ReactNode {
        let emptyText: React.ReactNode | null = null;
        if (this.props.tag.data.length <= 0) {
            emptyText = <span style={{ fontStyle: "italic" }}>empty list</span>;
        }
        const reRenderUi = this.forceUpdate.bind(this);
        return (
            <div className="text-nowrap" style={{ marginLeft: "-24px" }}>
                <div className="d-inline-block p-1 arrow" onClick={this.toggleOpen.bind(this)}>
                    <i className={"bi bi-chevron-" + (this.state.open ? "down" : "right")}></i>
                </div>
                {this.props.children != null && (
                    <NbtTagContainer label={null} populator={contextMenuForList(this.props.tag, this.props.parent, reRenderUi)}>
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
                                <React.Fragment key={index}>
                                    {index > 0 && <span>, </span>}
                                    <UiNbtTag tag={tag} root={false} parent={{parent: this.props.tag, index, reRenderUi}} />
                                </React.Fragment>
                            ))}
                            <span> ] </span>
                        </>
                )}
                {this.state.open && (
                    <div className="ms-4">
                        {this.props.tag.data.map((tag, index) => (
                            <div className="ms-3" key={index}>
                                <UiNbtTag tag={tag} root={false} parent={{parent: this.props.tag, index, reRenderUi}}>
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
            open: !this.state.open
        });
    }
}