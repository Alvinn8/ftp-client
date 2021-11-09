import * as React from "react";
import ContextMenuPopulator from "../contextmenu/ContextMenuPopulator";
import FolderEntriesPopulator from "../contextmenu/FolderEntriesPopulator";
import FolderEntryPopulator from "../contextmenu/FolderEntryPopulator";
import { selectedFiles } from "../selection/selection";
import { app } from "./index";

/**
 * Actions displayed on mobile for the current selection. Equivalent to the context
 * menu when right clicking on a desktop.
 */
export default class Actions extends React.Component {
    componentDidMount() {
        app.actions = this;
    }
    componentWillUnmount() {
        if (app.actions == this) {
            app.actions = null;
        }
    }

    render() {
        let populator: ContextMenuPopulator;
        if (selectedFiles.length == 0) {
            return <></>;
        } else if (selectedFiles.length == 1) {
            populator = new FolderEntryPopulator(selectedFiles[0]);
        } else {
            populator = new FolderEntriesPopulator(selectedFiles);
        }

        return (
            <div id="mobile-actions" className="p-1">
                {populator.getEntries().map((value, index) => {
                    return <button className="btn btn-success m-1" key={index} onClick={value.handler}>{value.name}</button>;
                })}
            </div>
        );
    }
}