import * as React from "react";
import CloseButton from "./CloseButton";

interface TextEditorControlsProps {
    window: Window;
    allowSaving: boolean;
}

interface TextEditorControlsState {
    saving: boolean;
}

export default class TextEditorControls extends React.Component<TextEditorControlsProps, TextEditorControlsState> {
    state = {
        saving: false
    };

    render() {
        return (
            <div className="px-3">
                <CloseButton window={this.props.window} />
                {this.props.allowSaving && (
                    <button
                        className="btn btn-primary float-end"
                        onClick={this.save.bind(this)}
                        disabled={this.state.saving}>
                        {this.state.saving ? <div className="spinner-border" role="status" /> : "Save"}
                    </button>
                )}
            </div>
        );
    }

    componentDidMount() {
        this.props.window["saveFinished"] = () => {
            this.setState({
                saving: false
            });
        };
    }

    save() {
        this.setState({
            saving: true
        });
        // @ts-ignore
        this.props.window.save();
    }
}