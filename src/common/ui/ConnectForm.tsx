import * as React from "react";
import WebsocketFTPConnection from "../../web/WebsocketFTPConnection";
import FTPProfile from "../ftp/FTPProfile";
import FTPSession from "../ftp/FTPSession";
import { State } from "./App";

let url = new URL(location.href);

function getString(id): string {
    if (url.searchParams.has(id)) {
        return url.searchParams.get(id);
    }
    return (document.getElementById(id) as HTMLInputElement).value;
}

function getBoolean(id): boolean {
    if (url.searchParams.has(id)) {
        return url.searchParams.get(id) == "true";
    }
    return (document.getElementById(id) as HTMLInputElement).checked;
}

interface ConnectFormProps {
    onProgress: (state: State) => void;
    onConnect: (session: FTPSession) => void;
    onConnectError: (msg: string) => void;
    onError: (e: Error) => void;
}

/**
 * A component for the form where the user enteres the FTP host and credentials.
 * <p>
 * Also handles connecting and extracting credentials from the URL.
 */
export default class ConnectForm extends React.Component<ConnectFormProps, {}> {
    async connect() {
        const host = getString("host");
        const port = parseInt(getString("port"));
        const username = getString("username");
        const password = getString("password");
        const secure = getBoolean("secure");

        const profile = new FTPProfile(host, port, username, password, secure);
        const session = profile.startSession();
        const connection = new WebsocketFTPConnection();
        session.setConnection(connection);

        this.props.onProgress(State.CONNECTING_TO_SERVER);
        const success = await connection.connectToWebsocket().then(() => true).catch((err) => {
            this.props.onProgress(State.FAILED_TO_CONNECT_TO_SERVER);
            return false;
        });
        if (!success) return;

        this.props.onProgress(State.CONNECTING_TO_FTP);
        const success2 = await connection.connect(host, port, username, password, secure).then(() => true).catch(err => {
            this.props.onProgress(State.FAILED_TO_CONNECT_TO_FTP);
            this.props.onConnectError(err.message);
            return false;
        });
        if (!success2) return;

        this.props.onConnect(session);
    }

    tryConnect() {
        this.connect().catch(err => {
            console.error(err);
            this.props.onError(err);
        });
    }

    componentDidMount() {
        if (url.searchParams.has("host"), url.searchParams.has("user"), url.searchParams.has("password")) {
            this.tryConnect();
            // Remove the credentials from the url
            url.search = "";
            history.replaceState(null, "", url.href);
        }
    }
    
    render() {
        return (
            <div className="container" style={{ maxWidth: "800px" }}>
                <p>Log in to the ftp server.</p>
                <div className="input-group">
                    <span className="input-group-text">Host and Port</span>
                    <input type="text" id="host" className="form-control" />
                    <input type="number" id="port" className="form-control" defaultValue="21" />
                </div>
                <br></br>
                <div className="mb-3">
                    <label htmlFor="username" className="form-label">Username</label>
                    <input type="text" id="username" className="form-control" />
                </div>
                <div className="mb-3">
                    <label htmlFor="password" className="form-label">Password</label>
                    <input type="text" id="password" className="form-control" />
                </div>
                <div className="mb-3">
                    <input type="checkbox" id="secure" className="form-check-input me-2" />
                    <label htmlFor="secure" className="form-label">Secure</label>
                </div>
                <button onClick={this.tryConnect.bind(this)} className="btn btn-success">Connect</button>
            </div>
        );
    }
}