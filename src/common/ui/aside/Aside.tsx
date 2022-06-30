import * as React from "react";
import FolderEntry from "../../folder/FolderEntry";
import DirectoryActions from "./DirectoryActions";
import DirectoryInfo from "./DirectoryInfo";
import EntriesInfo from "./EntriesInfo";
import FileInfo from "./FileInfo";

interface AsideProps {
    selection: FolderEntry[];
}

/**
 * A component that displays information about the current selection, or actions
 * about the current directory if nothing is selected.
 */
export default class Aside extends React.Component<AsideProps, {}> {
    render() {
        const selection = this.props.selection;
        return (
            <div>
                {selection.length == 0 && (
                    <DirectoryActions />
                )}
                {selection.length == 1 && selection[0].isFile() && (
                    <FileInfo entry={selection[0]} />
                )}
                {selection.length == 1 && selection[0].isDirectory() && (
                    <DirectoryInfo entry={selection[0]} />
                )}
                {selection.length > 1 && (
                    <EntriesInfo selection={selection} />
                )}
            </div>
        );
    }
}