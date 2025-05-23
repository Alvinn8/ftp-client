import * as React from "react";
import FolderEntry from "../../folder/FolderEntry";
import CompuseSize from "./ComputeSize";

interface DirectoryInfoProps {
    entry: FolderEntry;
}

/**
 * Information about a selected directory.
 */
export default class DirectoryInfo extends React.Component<DirectoryInfoProps, {}> {
    render() {
        const entry = this.props.entry;
        return (
            <div className="m-2">
                <p>File name: { entry.name }</p>
                <CompuseSize selection={[entry]} key={Math.random()} />
                <p>Last modified: { entry.modifiedAt }</p>
            </div>
        );
    }
}