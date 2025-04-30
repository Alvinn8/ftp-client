import * as React from "react";
import ContextMenuPopulator from "../contextmenu/ContextMenuPopulator";
import FolderEntriesPopulator from "../contextmenu/FolderEntriesPopulator";
import FolderEntryPopulator from "../contextmenu/FolderEntryPopulator";
import FolderContentProviders from "../folder/FolderContentProviders";
import FolderEntry from "../folder/FolderEntry";
import Priority from "../ftp/Priority";
import { handleOnDrop } from "../upload/upload";
import { createContextMenu, removeContextMenu } from "./ContextMenu";
import DropZone from "./DropZone";
import FolderEntryComponent from "./FolderEntryComponent";
import { parentdir, randomBetween, range } from "../utils";
import Dialog from "../Dialog";
import { getApp } from "./App";
import { unexpectedErrorHandler } from "../error";

interface FolderContentProps {
    workdir: string;
    onChangeDirectory: (workdir: string) => void;
    selection: FolderEntry[];
    toggleSelected: (entry: FolderEntry) => void;
    selectOnly: (entry: FolderEntry) => void;
    unselectAll: () => void;
}

interface FolderContentState {
    entries: FolderEntry[] | null;
    dragAndDrop: boolean;
}

/**
 * A component that renderes the files and folders in the current directory.
 */
export default class FolderContent extends React.Component<FolderContentProps, FolderContentState> {
    private readonly ref: React.RefObject<HTMLDivElement> = React.createRef();

    constructor(props) {
        super(props);

        this.state = {
            entries: null,
            dragAndDrop: false
        };
    }

    componentDidMount() {
        this.ref.current.ondragenter = this.onDragEnter.bind(this);
        this.ref.current.ondragleave = this.onDragLeave.bind(this);
        this.ref.current.ondrop = () => {};
        // noop event listener, we just need to listen for ondrop
        // to make the element a valid drag and drop target.
        
        this.getEntries().catch(err => {
            if (String(err).includes("ENOENT")) {
                Dialog.message("This folder has been deleted", "It appears the folder you were trying to go to has been deleted. The full error is: " + err);
                this.props.onChangeDirectory(parentdir(this.props.workdir));
                setTimeout(() => {
                    getApp().refresh(true);
                }, 1000);
            } else {
                unexpectedErrorHandler("Failed to fetch files")(err);
            }
        });
    }

    async getEntries() {
        const entries = await FolderContentProviders.MAIN.getFolderEntries(Priority.QUICK, this.props.workdir);
        entries.sort((a, b) => {
            if (a.isDirectory() && b.isFile()) return -1;
            if (b.isDirectory() && a.isFile()) return 1;
            if (a.name < b.name) return -1;
            if (b.name > a.name) return 1;
            return 0;
        });
        this.setState({
            entries
        });
    }

    onDragEnter(e: DragEvent) {
        e.preventDefault();
        this.setState({
            dragAndDrop: true
        });
        if (this.props.selection.length > 0) {
            this.props.unselectAll();
        }
    }

    onDragLeave(e: DragEvent) {
        if (!this.ref.current) {
            return;
        }
        const box = this.ref.current.getBoundingClientRect();
        const scrollTop = this.ref.current.parentElement.scrollTop;
        if (e.clientX > box.right
            || e.clientX < box.x
            || e.clientY > box.bottom + scrollTop
            || e.clientY < box.y + scrollTop) {
            this.setState({
                dragAndDrop: false
            });
        }
    }

    onDrop(e: DragEvent) {
        // Read and upload
        handleOnDrop(e).catch(unexpectedErrorHandler("Failed to upload"));

        this.setState({
            dragAndDrop: false
        });
    }

    handleClick(entry: FolderEntry, e: React.MouseEvent) {
        if (this.props.selection.length > 0 && !(e.shiftKey || e.metaKey || e.ctrlKey || e.altKey)) {
            if (this.props.selection.includes(entry)) {
                this.props.unselectAll();
            } else {
                this.props.selectOnly(entry);
            }
        } else {
            this.props.toggleSelected(entry);
        }
    }

    handleRightClick(entry: FolderEntry, e: React.MouseEvent) {
        e.preventDefault();
        removeContextMenu();

        const selection = this.props.selection;
        const selected = selection.includes(entry);

        let populator: ContextMenuPopulator;

        if (selected && selection.length == 1) {
            // This file was selected and then right clicked.
            populator = new FolderEntryPopulator(entry, this.props.onChangeDirectory);
        }
        else if (!selected && selection.length == 0) {
            // No files were selected but this one was right clicked,
            // select it and show the context menu for this file.
            populator = new FolderEntryPopulator(entry, this.props.onChangeDirectory);
            this.props.toggleSelected(entry);
        }
        else if (selected && selection.length > 1) {
            // Selection and this entry is a part of it
            populator = new FolderEntriesPopulator(selection);
        }
        else if (!selected && selection.length > 0) {
            // There is an existing selection and this entry is not a
            // part of it, lets unselect it and only select this entry.
            populator = new FolderEntryPopulator(entry, this.props.onChangeDirectory);
            this.props.selectOnly(entry);
        }

        createContextMenu(populator, e.clientX, e.clientY);
    }

    render() {
        let dropZone;
        if (this.state.dragAndDrop && this.ref.current) {
            const box = this.ref.current.getBoundingClientRect();
            const scrollTop = this.ref.current.parentElement.scrollTop;
            dropZone = <DropZone
                x={box.x}
                y={box.y + scrollTop}
                width={box.width}
                height={box.height}
                onDrop={this.onDrop.bind(this)}
            />;
        }
        return (
            <div className="py-3" ref={this.ref}>
                {this.state.entries == null && range(randomBetween(2, 8)).map(key => (
                    <div className="folder-entry" key={key}>
                        <div className="skeleton" style={{ width: "16px", height: "18px" }}></div>
                        <span className="skeleton" style={{ width: "150px", height: "18px" }}></span>
                    </div>
                )) }
                {this.state.entries != null &&
                    this.state.entries.map((value, index) => {
                        return (
                            <FolderEntryComponent
                                entry={value}
                                selected={this.props.selection.includes(value)}
                                onClick={(e) => this.handleClick(value, e)}
                                onRightClick={(e) => this.handleRightClick(value, e)}
                                onChangeDirectory={this.props.onChangeDirectory}
                                key={value.name}
                            />
                        );
                    })
                }
                {dropZone}
            </div>
        );
    }
}