import * as React from "react";
import { computeSize } from "../../contextmenu/actions";
import FolderEntry from "../../folder/FolderEntry";
import { app } from "../index";
import Size from "../Size";

interface CompuseSizeProps {
    selection: FolderEntry[];
}

interface CompuseSizeState {
    computing: boolean;
    size?: number;
}

/**
 * A component for the Compute Size button.
 */
export default class CompuseSize extends React.Component<CompuseSizeProps, CompuseSizeState> {
    state = {
        computing: false,
        size: null
    };

    render() {
        if (this.state.computing) {
            return (
                <div>
                    <p>Computing size...</p>
                    <div className="spinner-border"></div>
                </div>
            );
        }
        if (this.state.size == null) {
            return <button className="btn btn-primary" onClick={this.handleClick.bind(this)}>Compute size</button>;
        } else {
            return <p>Size: <Size size={this.state.size} /></p>;
        }
    }

    async handleClick() {
        if (!app.tasks.requestNewTask()) return;

        this.setState({
            computing: true,
            size: null
        });
        const size = await computeSize(this.props.selection);
        this.setState({
            computing: false,
            size: size
        });
    }
}