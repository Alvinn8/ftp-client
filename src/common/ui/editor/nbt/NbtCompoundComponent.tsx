import * as React from "react";
import { NbtCompound } from "../../../nbt/nbtTags";
import { NbtKey } from "./nbtParts";
import NbtTagComponent from "./NbtTagComponent";

interface NbtCompoundComponentProps {
    nbtCompound: NbtCompound;
}

interface NbtCompoundComponentState {
    open: boolean;
}

export default class NbtCompoundComponent extends React.Component<NbtCompoundComponentProps, NbtCompoundComponentState> {
    state = {
        open: false
    };

    render(): React.ReactNode {
        return (
            <div className="text-nowrap" style={{ "margin-left": "-24px" }}>
                <div className="d-inline-block p-1 folder-component-arrow" onClick={this.toggleOpen.bind(this)}>
                    <i className={"bi bi-chevron-" + (this.state.open ? "down" : "right")}></i>
                </div>
                {this.props.children}
                {this.state.open && (
                    <div className="ms-4">
                        {this.props.nbtCompound.getKeys().map((key, index) => (
                            <div className="ms-3">
                                <NbtTagComponent tag={this.props.nbtCompound.get(key)} key={index}>
                                    <NbtKey name={key} />
                                </NbtTagComponent>
                            </div>
                        ))}
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