import * as React from "react";
import { NbtCompound } from "../../../nbt/nbtTags";
import { UiNbtKey } from "./nbtParts";
import NbtTagContainer from "./NbtTagContainer";
import UiNbtTag from "./UiNbtTag";
import { contextMenuForCompound, ParentData } from "./nbtContextMenu";
interface UiNbtCompoundtProps {
    nbtCompound: NbtCompound;
    root: boolean;
    parent: ParentData;
}

interface UiNbtCompoundtState {
    open: boolean;
}

export default class UiNbtCompound extends React.Component<UiNbtCompoundtProps, UiNbtCompoundtState> {
    constructor(props) {
        super(props);
        this.state = {
            open: props.root
        };
    }

    render() {
        let emptyText: React.ReactNode | null = null;
        if (this.props.nbtCompound.getKeys().length <= 0) {
            emptyText = <span style={{ fontStyle: "italic" }}>empty</span>;
        }
        const reRenderUi = this.forceUpdate.bind(this);
        return (
            <div className="text-nowrap" style={{ marginLeft: "-24px" }}>
                <div className="d-inline-block p-1 arrow" onClick={this.toggleOpen.bind(this)}>
                    <i className={"bi bi-chevron-" + (this.state.open ? "down" : "right")}></i>
                </div>
                {this.props.children != null && (
                    <NbtTagContainer label={null} populator={contextMenuForCompound(this.props.nbtCompound, this.props.parent, reRenderUi)}>
                        {this.props.children}
                    </NbtTagContainer>
                )}
                {!this.state.open && emptyText != null && (
                    <span>: {emptyText}</span>
                )}
                {this.state.open && (
                    <div className="ms-4">
                        {this.props.nbtCompound.getKeys().map((key, index) => (
                            <div className="ms-3" key={key}>
                                <UiNbtTag
                                    tag={this.props.nbtCompound.get(key)}
                                    root={this.props.root && key == "Data"}
                                    parent={{parent: this.props.nbtCompound, key, reRenderUi}}
                                >
                                    <UiNbtKey name={key} />
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