import * as React from "react";
import FolderEntry, { FolderEntryType } from "../../folder/FolderEntry";
import FolderComponent from "./FolderComponent";

/**
 * The folder explorer where the folder structure can be explored.
 */
export default class FolderExplorer extends React.Component {
    private static readonly ROOT = new FolderEntry("/", "/", 0, FolderEntryType.Directory, "");

    render() {
        return <FolderComponent folderEntry={FolderExplorer.ROOT} parentPath="" />;
    }
}