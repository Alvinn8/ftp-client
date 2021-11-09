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

export let app: App;

export interface AppState {
    session: FTPSession;
    state: State;
    size: DeviceSize;
    mobileTab: MobileTab;
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
    public folderContent: FolderContent;
    public aside: Aside;
    public tasks: Tasks;
    public actions: Actions;
    
    constructor(props) {
        super(props);
        if (app != null) console.warn("app has been re-rendered, this might cause problems.");
        app = this;

        this.state = {
            session: null,
            state: State.LOGIN,
            size: getDeviceSize(),
            mobileTab: MobileTab.PATH
        };

        window.addEventListener("resize", () => {
            let size = getDeviceSize();

            if (this.state.size != size) {
                this.setState({
                    ...this.state,
                    size: size
                });
            }
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
                            <FolderContent provider={FolderContentProviders.MAIN} key={this.state.session.workdir} />
                        </div>

                        { /* Desktop */ }
                        {this.state.size == DeviceSize.DEKSTOP && (
                            <>
                                <div id="file-explorer" style={{ width: "20vw" }}>
                                    <FolderExplorer />
                                </div>
                                <Path />
                                <aside id="selected-info">
                                    <Aside />
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
                                        <Aside />
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
                                            onClick={() => this.setState({
                                                ...this.state,
                                                mobileTab: tab
                                            })}>
                                                <i className={"bi bi-" + tab.icon}></i>
                                            </button>
                                        );
                                    })}
                                </div>
                                <Actions />
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