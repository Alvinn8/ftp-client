import * as React from "react";
import { selectedFiles } from "../../selection/selection";
import { app } from "../index";
import DirectoryActions from "./DirectoryActions";
import DirectoryInfo from "./DirectoryInfo";
import EntriesInfo from "./EntriesInfo";
import FileInfo from "./FileInfo";

/**
 * A component that displays information about the current selection, or actions
 * about the current directory if nothing is selected.
 */
export default class Aside extends React.Component {
    constructor(props) {
        super(props);

        app.aside = this;
    }

    render() {
        return (
            <div>
                {selectedFiles.length == 0 && (
                    <DirectoryActions />
                )}
                {selectedFiles.length == 1 && selectedFiles[0].isFile() && (
                    <FileInfo />
                )}
                {selectedFiles.length == 1 && selectedFiles[0].isDirectory() && (
                    <DirectoryInfo />
                )}
                {selectedFiles.length > 1 && (
                    <EntriesInfo />
                )}
            </div>
        );
    }
}