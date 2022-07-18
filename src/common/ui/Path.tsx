import * as React from "react";

interface PathProps {
    workdir: string;
    onCdupClick: () => void;
}

/**
 * A component that renders the current path.
 */
export default class Path extends React.Component<PathProps, {}> {
    render() {
        return (
            <div id="workdir">
                <div className="input-group">
                    <button onClick={this.props.onCdupClick} className="btn btn-primary">
                        <i className="bi bi-arrow-left-square"></i>
                    </button>
                    <input
                        type="text"
                        readOnly
                        value={this.props.workdir}
                        className="form-control bg-white"
                        aria-label="Current folder path"
                    />
                </div>
            </div>
        );
    }
}