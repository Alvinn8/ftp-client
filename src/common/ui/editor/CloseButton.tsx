import * as React from "react";

interface CloseButtonProps {
    window: Window;
}

/**
 * The close button on editors.
 */
export default class CloseButton extends React.Component<CloseButtonProps, {}> {
    render() {
        return <button className="btn btn-secondary" onClick={this.close.bind(this)}>Close</button>;
    }

    close() {
        if (typeof this.props.window["doClose"] == "function") {
            // When the editor is made using an iframe, the onClose function will be
            // defined and will remove the iframe from the parent window.
            this.props.window["doClose"]();
        } else {
            // When the editor is made using a window, it can simply be closed using
            // window.close in the child window.
            this.props.window.close();
        }
    }
}