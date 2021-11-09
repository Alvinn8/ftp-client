import * as React from "react";
import { app } from "./index";

/**
 * A component that renders the current path.
 */
export default class Path extends React.Component {
    render() {
        return (
            <div id="workdir">
                <div className="input-group">
                    <button onClick={app.state.session.cdup.bind(app.state.session)} className="btn btn-primary">
                        <i className="bi bi-arrow-left-square"></i>
                    </button>
                    <input type="text" readOnly value={app.state.session.workdir} className="form-control bg-white" />
                </div>
            </div>
        );
    }
}