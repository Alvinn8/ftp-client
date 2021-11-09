import * as React from "react";
import { selectedFiles } from "../../selection/selection";
import CompuseSize from "./ComputeSize";

/**
 * Information about a selected directory.
 */
export default class DirectoryInfo extends React.Component {
    render() {
        const entry = selectedFiles[0];
        return (
            <div>
                <p>File name: { entry.name }</p>
                <CompuseSize />
                <p>Last modified: { entry.modifiedAt }</p>
            </div>
        );
    }
}