import * as React from "react";
import * as ReactDOM from "react-dom";
import FTPSession from "../ftp/FTPSession";
import ConnectForm from "./ConnectForm";
import FolderContent from "./FolderContent";
import Aside from "./aside/Aside";
import FolderContentProviders from "../folder/FolderContentProviders";
import Messages from "./messages";
import Tasks from "./task/tasks";
import Path from "./Path";
import Actions from "./Actions";
import FolderExplorer from "./left/FolderExplorer";
import FolderEntry from "../folder/FolderEntry";

export let app: App;

export interface AppState {
    session: FTPSession;
    state: State;
    size: DeviceSize;
    mobileTab: MobileTab;
    selection: FolderEntry[];
    refreshCount: number;
}

export enum State {
    LOGIN,
    CONNECTING_TO_SERVER,
    CONNECTING_TO_FTP,
    CONNECTED
}

export enum DeviceSize {
    DEKSTOP,
    MOBILE
}

export function getDeviceSize(): DeviceSize {
    if (window.innerWidth <= 600) {
        return DeviceSize.MOBILE;
    } else {
        return DeviceSize.DEKSTOP;
    }
}

const mobileTabs: MobileTab[] = [];

class MobileTab {
    public static readonly PATH = new MobileTab("folder-fill");
    public static readonly INFO = new MobileTab("info-circle-fill");
    public static readonly FOLDERS = new MobileTab("diagram-3-fill");

    public readonly icon: string;

    private constructor(icon) {
        this.icon = icon;
        mobileTabs.push(this);
    }
}

export class App extends React.Component<{}, AppState> {
    public tasks: Tasks;
    
    constructor(props) {
        super(props);
        if (app != null) console.warn("app has been re-rendered, this might cause problems.");
        app = this;

        this.state = {
            session: null,
            state: State.LOGIN,
            size: getDeviceSize(),
            mobileTab: MobileTab.PATH,
            selection: [],
            refreshCount: 0
        };

        this.handleResize = this.handleResize.bind(this);
        this.toggleSelected = this.toggleSelected.bind(this);
        this.selectOnly = this.selectOnly.bind(this);
        this.unselectAll = this.unselectAll.bind(this);
    }

    componentDidMount() {
        window.addEventListener("resize", this.handleResize);
    }

    componentWillUnmount(): void {
        window.addEventListener("resize", this.handleResize);
    }

    handleResize() {
        let size = getDeviceSize();

        if (this.state.size != size) {
            this.setState({
                size: size
            });
        }
    }

    toggleSelected(entry: FolderEntry) {
        const selection = this.state.selection.slice();
        if (selection.includes(entry)) {
            selection.splice(selection.indexOf(entry), 1);
        } else {
            selection.push(entry);
        }
        this.setState({
            selection
        });
    }

    selectOnly(entry: FolderEntry) {
        this.setState({
            selection: [entry]
        });
    }

    unselectAll() {
        this.setState({
            selection: []
        });
    }
    
    refresh() {
        this.setState({
            selection: [],
            refreshCount: this.state.refreshCount + 1
        });
    }

    render() {
        return (
            <div>
                { this.state.state == State.LOGIN && <ConnectForm />}
                { this.state.state == State.CONNECTING_TO_SERVER && <p>Connecting to ftp-client...</p>}
                { this.state.state == State.CONNECTING_TO_FTP && <p>Connecting...</p>}
                { this.state.state == State.CONNECTED &&
                    <div id="grid">
                        <header>
                            <h1>ftp-client</h1>
                        </header>
                        <div id="folder-content">
                            <FolderContent
                                provider={FolderContentProviders.MAIN}
                                key={this.state.session.workdir + "-" + this.state.refreshCount}
                                selection={this.state.selection}
                                toggleSelected={this.toggleSelected}
                                selectOnly={this.selectOnly}
                                unselectAll={this.unselectAll}
                            />
                        </div>

                        { /* Desktop */ }
                        {this.state.size == DeviceSize.DEKSTOP && (
                            <>
                                <div id="file-explorer" style={{ width: "20vw" }}>
                                    <FolderExplorer />
                                </div>
                                <Path />
                                <aside id="selected-info">
                                    <Aside selection={this.state.selection} />
                                </aside>
                            </>
                        )}

                        { /* Mobile */ }
                        {this.state.size == DeviceSize.MOBILE && (
                            <>
                                <div id="mobile-current-tab" className="overflow-auto">
                                    {this.state.mobileTab == MobileTab.PATH && (
                                        <Path />
                                    )}
                                    {this.state.mobileTab == MobileTab.INFO && (
                                        <Aside selection={this.state.selection} />
                                    )}
                                    {this.state.mobileTab == MobileTab.FOLDERS && (
                                        <FolderExplorer />
                                    )}
                                </div>
                                <div id="mobile-tab-buttons">
                                    {mobileTabs.map((tab, index) => {
                                        return (
                                            <button
                                                key={index}
                                                className={"btn btn-" + (this.state.mobileTab == tab ? "primary" : "secondary")}
                                                onClick={() => this.setState({ mobileTab: tab })}
                                            >
                                                <i className={"bi bi-" + tab.icon}></i>
                                            </button>
                                        );
                                    })}
                                </div>
                                <Actions selection={this.state.selection} />
                            </>
                        )}
                    </div>
                }
                <Messages />
                <Tasks />
            </div>
        );
    }
}

ReactDOM.render(<App />, document.getElementById("root"));

window["app"] = app;