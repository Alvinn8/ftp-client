import * as React from "react";
import { selectedFiles } from "../../selection/selection";
import Size from "../Size";

/**
 * Information about a selected file.
 */
export default class FileInfo extends React.Component {
    render() {
        const entry = selectedFiles[0];
        return (
            <div>
                <p>File name: { entry.name }</p>
                <p>Size: <Size size={entry.size} /></p>
                <p>Last modified: { entry.modifiedAt }</p>
            </div>
        );
    }
}