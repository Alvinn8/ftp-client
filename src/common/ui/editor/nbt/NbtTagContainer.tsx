import * as React from "react";

interface Props {
    label: React.ReactNode | null;
}

interface State {
    selected: boolean;
}

export default class NbtTagContainer extends React.Component<Props, State> {
    state = {
        selected: false
    }

    render() {
        return (
            <div
                className={"tag-container" + (this.state.selected ? " selected" : "")}
                onClick={() => this.setState({ selected: !this.state.selected })}
                // TODO proper selecting
            >
                {this.props.label != null && (
                    <span>{this.props.label}: </span>
                )}
                {this.props.children}
            </div>
        );
    }
}