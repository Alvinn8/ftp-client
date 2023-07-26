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
        await connection.connectToWebsocket();
        this.props.onProgress(State.CONNECTING_TO_FTP);
        await connection.connect(host, port, username, password, secure);
        this.props.onConnect(session);
    } catch(e) {
        console.error(e);
        this.props.onError(e);
    }

    componentDidMount() {
        if (url.searchParams.has("host"), url.searchParams.has("user"), url.searchParams.has("password")) {
            this.connect();
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
                <button onClick={this.connect.bind(this)} className="btn btn-success">Connect</button>
            </div>
        );
    }
}