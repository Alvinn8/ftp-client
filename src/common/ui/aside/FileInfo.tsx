import * as React from "react";
import FolderEntry from "../../folder/FolderEntry";
import Size from "../Size";

interface FileInfoProps {
    entry: FolderEntry;
}

/**
 * Information about a selected file.
 */
export default class FileInfo extends React.Component<FileInfoProps, {}> {
    render() {
        const entry = this.props.entry;
        return (
            <div>
                <p>File name: { entry.name }</p>
                <p>Size: <Size size={entry.size} /></p>
                <p>Last modified: { entry.modifiedAt }</p>
            </div>
        );
    }
}