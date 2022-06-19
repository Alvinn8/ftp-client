import * as React from "react";
import NbtData from "../../../nbt/NbtData";
import CloseButton from "../CloseButton";
import UiNbtTag from "./UiNbtTag";

interface NbtEditorControlsProps {
    window: Window;
    allowSaving: boolean;
    nbt: NbtData;
}

interface NbtEditorControlsState {
    saving: boolean;
}


export default class NbtEditor extends React.Component<NbtEditorControlsProps, NbtEditorControlsState> {
    state = {
        saving: false
    };

    render() {
        return (
            <div>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-wEmeIV1mKuiNpC+IOBjI7aAzPcEZeedi5yW5f2yOq55WWLwNGmvvx4Um1vskeMj0" crossOrigin="anonymous" />
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.5.0/font/bootstrap-icons.css"></link>
                <div className="grid">
                    <div className="ms-5 nbt-editor">
                        <UiNbtTag tag={this.props.nbt.tag} />
                    </div>
                    <div className="p-3 bottom-0 position-fixed controls">
                        <div className="mobile-actions"></div>
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
                </div>
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