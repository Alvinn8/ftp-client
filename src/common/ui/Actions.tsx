import * as React from "react";
import ContextMenuPopulator from "../contextmenu/ContextMenuPopulator";
import FolderEntriesPopulator from "../contextmenu/FolderEntriesPopulator";
import FolderEntryPopulator from "../contextmenu/FolderEntryPopulator";
import FolderEntry from "../folder/FolderEntry";

interface ActionsProps {
    selection: FolderEntry[];
}

/**
 * Actions for the current selection. Equivalent to the context menu when right
 * clicking on a desktop.
 */
export default class Actions extends React.Component<ActionsProps, {}> {
    render() {
        const selection = this.props.selection;
        let populator: ContextMenuPopulator;
        if (selection.length == 0) {
            return <></>;
        } else if (selection.length == 1) {
            populator = new FolderEntryPopulator(selection[0]);
        } else {
            populator = new FolderEntriesPopulator(selection);
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