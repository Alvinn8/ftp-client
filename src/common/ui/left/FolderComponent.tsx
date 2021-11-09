import * as React from "react";
import FolderContentProviders from "../../folder/FolderContentProviders";
import FolderEntry from "../../folder/FolderEntry";
import { app } from "../index";

interface FolderComponentProps {
    folderEntry: FolderEntry;
    parentPath: string;
}

interface FolderComponentState {
    open: boolean;
    /**
     * Whether this folder has no content. If this is false the folder does not have
     * any subfolders. Although this being false does not mean it has, it can also mean
     * that it is currently not known whether it has subfolders.
     */
    noContent: boolean;
    content: FolderEntry[];
}

/**
 * A folder in the folder explorer view.
 */
export default class FolderComponent extends React.Component<FolderComponentProps, FolderComponentState> {
    state: FolderComponentState = {
        open: false,
        noContent: false,
        content: null
    };
    private fetchingContent = false;
    private path = this.props.parentPath + (this.props.parentPath.endsWith("/") || this.props.parentPath == "" ? "" : "/") + this.props.folderEntry.name;

    componentDidMount() {
        window["fc"] = this;
    }

    render() {
        if (this.state.open && this.state.content == null && !this.fetchingContent) {
            this.getContent();
        }
        return (
            <div className="text-nowrap">
                <div className="d-inline-block p-1 folder-component-arrow" onClick={this.toggleOpen.bind(this)}>
                    <i className={"bi bi-chevron-" + (this.state.open ? "down" : "right")}></i>
                </div>
                <div className="d-inline-block cursor-pointer" onClick={this.goto.bind(this)}>
                    <i className="bi bi-folder-fill text-primary me-1"></i>
                    <span>{this.props.folderEntry.name}</span>
                </div>
                {this.state.open && (
                    <div className="ms-3">
                        {this.state.content != null && (
                            this.state.content.map((value, index) => {
                                return <FolderComponent folderEntry={value} parentPath={this.path} key={index} />;
                            })
                        )}
                        {this.state.content == null && (
                            <small>Loading...</small>
                        )}
                    </div>
                )}
                {}
            </div>
        );
    }

    async getContent() {
        if (!app.tasks.requestNewTask()) {
            this.setState({
                ...this.state,
                open: false
            });
            return;
        }
        this.fetchingContent = true;
        const content: FolderEntry[] = [];
        console.log(this.path);
        for (const folderEntry of await FolderContentProviders.MAIN.getFolderEntriesFor(this.path)) {
            if (folderEntry.isDirectory()) content.push(folderEntry);
        }
        this.setState({
            ...this.state,
            content
        });
    }

    toggleOpen() {
        this.setState({
            ...this.state,
            open: !this.state.open
        });
    }

    goto() {
        app.state.session.cd(this.path);
    }
}