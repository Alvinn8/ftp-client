import * as React from "react";
import { NbtCompound } from "../../../nbt/nbtTags";
import { UiNbtKey } from "./nbtParts";
import NbtTagContainer from "./NbtTagContainer";
import UiNbtTag from "./UiNbtTag";

interface UiNbtCompoundtProps {
    nbtCompound: NbtCompound;
    root: boolean;
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
                {this.state.open && (
                    <div className="ms-4">
                        {this.props.nbtCompound.getKeys().map((key, index) => (
                            <div className="ms-3">
                                <UiNbtTag tag={this.props.nbtCompound.get(key)} key={index} root={this.props.root && key == "Data"}>
                                    <UiNbtKey name={key} />
                                </UiNbtTag>
                            </div>
                        ))}
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