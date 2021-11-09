import * as React from "react";
import * as ReactDOM from "react-dom";
import ContextMenuPopulator from "../contextmenu/ContextMenuPopulator";
import FolderEntriesPopulator from "../contextmenu/FolderEntriesPopulator";
import FolderEntryPopulator from "../contextmenu/FolderEntryPopulator";
import Dialog from "../Dialog";
import FolderEntry from "../folder/FolderEntry";
import { addComponent, removeComponent, selectedFiles, selectFile, unselectAll, unselectFile } from "../selection/selection";
import { ContextMenu, removeContextMenu, setContextMenu } from "./ContextMenu";
import { openImageEditor, openTextEditor } from "./editor/editor";
import { getFileType, getIconFor } from "./FileFormats";
import { app } from "./index";

interface FolderEntryComponentProps {
    entry: FolderEntry;
}

interface FolderEntryComponentState {
    selected: boolean;
}

/**
 * A component for rendering a {@link FolderEntry}.
 */
export default class FolderEntryComponent extends React.Component<FolderEntryComponentProps, FolderEntryComponentState> {    
    constructor(props) {
        super(props);
        
        this.state = {
            selected: false
        };

        this.onClick = this.onClick.bind(this);
        this.onDoubleClick = this.onDoubleClick.bind(this);
        this.onRightClick = this.onRightClick.bind(this);
    }
    
    render() {
        let icon;
        if (this.props.entry.isFile()) {
            const iconName = getIconFor(this.props.entry.name);
            icon = <i className={"bi bi-" + iconName}></i>;
        } else if (this.props.entry.isDirectory()) {
            icon = <i className={"bi bi-folder-fill text-" + (this.state.selected ? "white" : "primary")}></i>;
        } else {
            icon = <i className="bi bi-question-square"></i>;
        }
        return (
            <div
            className={"folder-entry" + (this.state.selected ? " bg-primary rounded text-white" : "")}
            onClick={this.onClick}
            onDoubleClick={this.onDoubleClick}
            onContextMenu={this.onRightClick}>
                { icon }
                <span>{ this.props.entry.name }</span>
            </div>
        );
    }

    componentDidMount() {
        addComponent(this);
    }

    componentWillUnmount() {
        removeComponent(this);
    }

    toggleSelected() {
        const selected = !this.state.selected;
        this.setState({
            selected: selected
        });
        if (selected) {
            selectFile(this.props.entry);
        } else {
            unselectFile(this.props.entry);
        }
    }

    onClick(e: React.MouseEvent) {
        if (selectedFiles.length > 0 && !(e.shiftKey || e.metaKey || e.ctrlKey || e.altKey)) {
            unselectAll();
        }
        this.toggleSelected();
    }

    onRightClick(e: React.MouseEvent) {
        e.preventDefault();
        removeContextMenu();

        const element = document.createElement("div");
        element.style.position = "fixed";
        element.style.left = e.clientX + "px";
        element.style.top = e.clientY + "px";
        document.body.appendChild(element);

        let populator: ContextMenuPopulator;

        if (this.state.selected && selectedFiles.length == 1) {
            // This file was selected and then right clicked.
            populator = new FolderEntryPopulator(this.props.entry);
        }
        else if (!this.state.selected && selectedFiles.length == 0) {
            // No files were selected but this one was right clicked,
            // select it and show the context menu for this file.
            populator = new FolderEntryPopulator(this.props.entry);
            this.toggleSelected();
        }
        else if (this.state.selected && selectedFiles.length > 1) {
            // Selection and this entry is a part of it
            populator = new FolderEntriesPopulator(selectedFiles);
        }
        else if (!this.state.selected && selectedFiles.length > 0) {
            // There is an existing selection and this entry is not a
            // part of it, lets unselect it and only select this entry.
            populator = new FolderEntryPopulator(this.props.entry);
            unselectAll();
            this.toggleSelected();
        }

        ReactDOM.render(<ContextMenu populator={ populator } />, element);
        setContextMenu({
            container: element
        });
    }

    async onDoubleClick(e: React.MouseEvent) {
        e.preventDefault();
        if (this.props.entry.isDirectory()) {
            app.state.session.cd(this.props.entry.name);
        } else if (this.props.entry.isFile()) {
            let fileType = getFileType(this.props.entry.name);

            if (fileType == "unknown") {
                const option = await Dialog.choose("Open " + this.props.entry.name, "How would you like to open the file?", [
                    { id: "text", name: "Open as text"},
                    { id: "image", name: "Open as image"}
                ]);
                if (option == "text" || option == "image") fileType = option;
            }

            if (fileType == "text") {
                openTextEditor(this.props.entry);
            } else if (fileType == "image") {
                openImageEditor(this.props.entry);
            }
        }
    }
}