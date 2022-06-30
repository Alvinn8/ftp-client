import * as React from "react";
import FolderEntry from "../folder/FolderEntry";
import { openEditor } from "./editor/editor";
import { getIconFor } from "./FileFormats";
import { app } from "./index";

interface FolderEntryComponentProps {
    entry: FolderEntry;
    selected: boolean;
    onClick: (e: React.MouseEvent) => void;
    onRightClick: (e: React.MouseEvent) => void;
}

/**
 * A component for rendering a {@link FolderEntry}.
 */
export default class FolderEntryComponent extends React.Component<FolderEntryComponentProps, {}> {    
    render() {
        let icon: React.ReactNode;
        if (this.props.entry.isFile()) {
            const iconName = getIconFor(this.props.entry.name);
            icon = <i className={"bi bi-" + iconName}></i>;
        } else if (this.props.entry.isDirectory()) {
            icon = <i className={"bi bi-folder-fill text-" + (this.props.selected ? "white" : "primary")}></i>;
        } else {
            icon = <i className="bi bi-question-square"></i>;
        }
        return (
            <div
                className={"folder-entry" + (this.props.selected ? " bg-primary rounded text-white" : "")}
                onClick={this.props.onClick}
                onContextMenu={this.props.onRightClick}
                onDoubleClick={this.handleDoubleClick.bind(this)}
            >
                { icon }
                <span>{ this.props.entry.name }</span>
            </div>
        );
    }

    async handleDoubleClick(e: React.MouseEvent) {
        e.preventDefault();
        if (this.props.entry.isDirectory()) {
            app.state.session.cd(this.props.entry.name);
        } else if (this.props.entry.isFile()) {
            openEditor(this.props.entry);
        }
    }
}