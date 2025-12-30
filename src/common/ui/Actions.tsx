import * as React from "react";
import ContextMenuPopulator from "../contextmenu/ContextMenuPopulator";
import FolderEntriesPopulator from "../contextmenu/FolderEntriesPopulator";
import FolderEntryPopulator from "../contextmenu/FolderEntryPopulator";
import FolderEntry from "../folder/FolderEntry";
import Button from "../ui2/components/elements/Button";
import { getSession, useSession } from "../ui2/store/sessionStore";
import { useNewUiStore } from "../ui2/store/newUiStore";

interface ActionsProps {
    selection: FolderEntry[];
    onChangeDirectory: (workdir: string) => void;
}

/**
 * Actions for the current selection. Equivalent to the context menu when right
 * clicking on a desktop.
 */
export default class Actions extends React.Component<ActionsProps, {}> {
    render() {
        
        const goToNewUi = () => {
            useSession.getState().setSession(getSession());
            useNewUiStore.getState().toggleUseNewUi();
        };
        
        const selection = this.props.selection;
        let populator: ContextMenuPopulator;
        if (selection.length == 0) {
            return (
                <div id="mobile-actions" className="d-flex align-items-end justify-content-end p-1">
                    <Button variant="ghost" label="Try new UI" onClick={() => goToNewUi()} />
                </div>
            );
        } else if (selection.length == 1) {
            populator = new FolderEntryPopulator(selection[0], this.props.onChangeDirectory);
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