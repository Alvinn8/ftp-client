import * as React from "react";
import CloseButton from "./CloseButton";

interface ImageEditorProps {
    url: string;
    window: Window;
}

interface ImageEditorState {
    dimensions: string;
}

export default class ImageEditor extends React.Component<ImageEditorProps, ImageEditorState> {
    ref: React.RefObject<HTMLImageElement> = React.createRef();
    state = {
        dimensions: ""
    };

    render() {
        return (
            <div>
                <img src={this.props.url} ref={this.ref} />
                <p>{this.state.dimensions}</p>
                <div className="p-3 bottom-0 position-fixed">
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-wEmeIV1mKuiNpC+IOBjI7aAzPcEZeedi5yW5f2yOq55WWLwNGmvvx4Um1vskeMj0" crossOrigin="anonymous" />
                    <CloseButton window={this.props.window} />
                </div>
            </div>
        );
    }

    componentDidMount() {
        this.ref.current.addEventListener("load", () => {
            this.setState({
                dimensions: this.ref.current.width + "x" + this.ref.current.height
            });
        });
    }
}