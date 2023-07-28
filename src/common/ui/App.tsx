import * as React from "react";
import FTPSession from "../ftp/FTPSession";
import ConnectForm from "./ConnectForm";
import FolderContent from "./FolderContent";
import Aside from "./aside/Aside";
import Messages from "./messages";
import Tasks from "./task/Tasks";
import Path from "./Path";
import Actions from "./Actions";
import FolderExplorer from "./left/FolderExplorer";
import FolderEntry from "../folder/FolderEntry";
import DirectoryPath from "../ftp/DirectoryPath";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./style.css";
import OpenEditors from "./editor/OpenEditors";
import LargeFileOperation from "./LargeFileOperation";
import ConnectingScreen from "./ConnectingScreen";
import ErrorScreen from "./ErrorScreen";
import VERSION from "../version";

let app: App;

export function getApp() {
    if (!app) {
        console.warn(new Error().stack);
        throw new Error("App is not rendered.");
    }
    return app;
}

interface AppProps {
    session?: FTPSession;
}

export interface AppState {
    session: FTPSession;
    state: State;
    size: DeviceSize;
    mobileTab: MobileTab;
    workdir: string;
    selection: FolderEntry[];
    refreshCount: number;
    connectionError: string | null;
}

export enum State {
    LOGIN,
    CONNECTING_TO_SERVER,
    FAILED_TO_CONNECT_TO_SERVER,
    CONNECTING_TO_FTP,
    FAILED_TO_CONNECT_TO_FTP,
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
    public static readonly PATH = new MobileTab("folder-fill", "Current folder path");
    public static readonly INFO = new MobileTab("info-circle-fill", "Selection information and actions");
    public static readonly FOLDERS = new MobileTab("diagram-3-fill", "Folder explorer");

    public readonly icon: string;
    public readonly label: string;

    private constructor(icon: string, label: string) {
        this.icon = icon;
        this.label = label;
        mobileTabs.push(this);
    }
}

export class App extends React.Component<AppProps, AppState> {
    constructor(props) {
        super(props);
        if (app != null) {
            console.warn("app has been re-rendered, this might cause problems.");
        }
        app = this;

        this.state = {
            session: null,
            state: State.LOGIN,
            size: getDeviceSize(),
            mobileTab: MobileTab.PATH,
            workdir: "/",
            selection: [],
            refreshCount: 0,
            connectionError: null
        };

        if (this.props.session) {
            this.state = {
                ...this.state,
                session: this.props.session,
                state: State.CONNECTED
            };
        }

        this.handleResize = this.handleResize.bind(this);
        this.toggleSelected = this.toggleSelected.bind(this);
        this.selectOnly = this.selectOnly.bind(this);
        this.unselectAll = this.unselectAll.bind(this);
        this.cd = this.cd.bind(this);
        this.cdup = this.cdup.bind(this);
    }

    componentDidMount() {
        window.addEventListener("resize", this.handleResize);
    }

    componentWillUnmount(): void {
        window.addEventListener("resize", this.handleResize);
        app = null;
    }

    handleResize() {
        let size = getDeviceSize();

        if (this.state.size != size) {
            this.setState({
                size: size
            });
        }
    }

    cd(path: string) {
        this.setState({
            workdir: new DirectoryPath(this.state.workdir).cd(path).get(),
            selection: []
        });
    }

    cdup() {
        this.setState({
            workdir: new DirectoryPath(this.state.workdir).cdup().get(),
            selection: []
        });
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

    refresh(clearCacheDeep = false) {
        if (clearCacheDeep) {
            this.state.session.clearCacheFor(this.state.workdir);
        } else {
            delete this.state.session.cache[this.state.workdir];
        }
        this.setState({
            selection: [],
            refreshCount: this.state.refreshCount + 1
        });
    }

    render() {
        const path = <Path workdir={this.state.workdir} onCdupClick={this.cdup} />;
        const aside = <Aside workdir={this.state.workdir} selection={this.state.selection} />;
        const folderExplorer = <FolderExplorer onChangeDirectory={this.cd} />;
        const actions = <Actions selection={this.state.selection} onChangeDirectory={this.cd} />;

        return (
            <div>
                {this.state.state == State.LOGIN && (
                    <ConnectForm
                        onProgress={stage => this.setState({ state: stage })}
                        onConnect={session => this.setState({ session, state: State.CONNECTED })}
                        onConnectError={msg => this.setState({ connectionError: msg })}
                        onError={e => this.setState({ state: State.LOGIN })}
                    />
                )}
                {this.state.state == State.CONNECTING_TO_SERVER && <ConnectingScreen title="Connecting to ftp-client" body="Connecting to ftp-client..." />}
                {this.state.state == State.FAILED_TO_CONNECT_TO_SERVER && <ErrorScreen title="Failed to connect to ftp-client" body="Please try again." />}
                {this.state.state == State.CONNECTING_TO_FTP && <ConnectingScreen title="Connecting" body="Connecting to your files..." />}
                {this.state.state == State.FAILED_TO_CONNECT_TO_FTP && <ErrorScreen title="Failed to connect" body={this.state.connectionError} />}
                {this.state.state == State.CONNECTED &&
                    <div id="grid">
                        <header>
                            <h1>ftp-client</h1>
                        </header>
                        <div id="folder-content">
                            <FolderContent
                                key={this.state.workdir + "-" + this.state.refreshCount}
                                workdir={this.state.workdir}
                                onChangeDirectory={this.cd}
                                selection={this.state.selection}
                                toggleSelected={this.toggleSelected}
                                selectOnly={this.selectOnly}
                                unselectAll={this.unselectAll}
                            />
                        </div>

                        { /* Desktop */}
                        {this.state.size == DeviceSize.DEKSTOP && (
                            <>
                                <div id="file-explorer" style={{ width: "20vw" }}>
                                    {folderExplorer}
                                </div>
                                {path}
                                <aside id="selected-info">
                                    {aside}
                                    {actions}
                                    <small id="version" className="text-secondary">Version: { VERSION }</small>
                                </aside>
                            </>
                        )}

                        { /* Mobile */}
                        {this.state.size == DeviceSize.MOBILE && (
                            <>
                                <div id="mobile-current-tab" className="overflow-auto">
                                    {this.state.mobileTab == MobileTab.PATH && (
                                        <>{path}</>
                                    )}
                                    {this.state.mobileTab == MobileTab.INFO && (
                                        <>{aside}</>
                                    )}
                                    {this.state.mobileTab == MobileTab.FOLDERS && (
                                        <>{folderExplorer}</>
                                    )}
                                </div>
                                <div id="mobile-tab-buttons">
                                    {mobileTabs.map((tab, index) => {
                                        return (
                                            <button
                                                key={index}
                                                className={"btn btn-" + (this.state.mobileTab == tab ? "primary" : "secondary")}
                                                onClick={() => this.setState({ mobileTab: tab })}
                                                title={tab.label}
                                            >
                                                <i className={"bi bi-" + tab.icon}></i>
                                            </button>
                                        );
                                    })}
                                </div>
                                {actions}
                            </>
                        )}
                    </div>
                }
                <Messages />
                <div className="position-absolute bottom-0 end-0 p-3 d-flex flex-column" style={{ gap: "8px" }}>
                    <LargeFileOperation />
                    <Tasks />
                    <OpenEditors />
                </div>
            </div>
        );
    }
}

window["app"] = app;