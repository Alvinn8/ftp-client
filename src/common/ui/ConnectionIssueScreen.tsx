import React, { useEffect } from "react";
import Button from "./components/elements/Button";
import { useConnectionIssue } from "./store/connectionIssueStore";
import { useSession } from "./store/sessionStore";
import { getConfig } from "@common/config/config";
import {
    formatError,
    LoginError,
    unexpectedErrorHandler,
} from "@common/util/error";

/**
 * A full-screen overlay shown when the session is unable to create new
 * connections to the server, for example because of server downtime or a lost
 * internet connection.
 *
 * It covers the file browser so the user cannot keep navigating without a
 * connection, but leaves the rest of the app mounted so ongoing tasks (such as
 * a large upload) can resume once the connection is restored.
 */
const ConnectionIssueScreen: React.FC = () => {
    const issue = useConnectionIssue((state) => state.issue);
    const reconnecting = useConnectionIssue((state) => state.reconnecting);
    const setReconnecting = useConnectionIssue(
        (state) => state.setReconnecting,
    );
    const hasSession = useSession((state) => state.hasSession());

    const retry = () => {
        if (!useSession.getState().hasSession()) {
            return;
        }
        const session = useSession.getState().getSession();
        setReconnecting(true);
        session
            .getConnectionPool()
            .retryConnections()
            .catch(unexpectedErrorHandler("Failed to reconnect"))
            .finally(() => {
                // A successful attempt clears the issue (via connectionAvailable).
                // If the issue is still showing, the attempt failed, so re-enable
                // the button to allow retrying again.
                const state = useConnectionIssue.getState();
                if (state.issue) {
                    state.setReconnecting(false);
                }
            });
    };

    // Automatically retry when the browser regains connectivity.
    useEffect(() => {
        if (!issue) {
            return;
        }
        const onOnline = () => retry();
        window.addEventListener("online", onOnline);
        return () => window.removeEventListener("online", onOnline);
    }, [issue]);

    if (!hasSession || !issue) {
        return null;
    }

    const appName = getConfig().branding.appName;
    const message = getErrorMessage(issue.error);

    // Prioritise the offline message: when offline we cannot reach the server,
    // so a server-reported error (if any) is likely stale.
    let title: string;
    let icon: string;
    let body: string;
    if (issue.offline) {
        title = "No internet connection";
        icon = "wifi-off";
        body = `It appears you are not connected to the internet, or ${appName} is experiencing downtime. Check your internet connection and try again.`;
    } else if (message) {
        title = "Connection error";
        icon = "exclamation-circle-fill";
        body = "Unable to connect. Your tasks have been paused.";
    } else {
        title = "Connection lost";
        icon = "wifi-off";
        body =
            "The connection to the server was lost. This may be due to  downtime or a network issue. Any ongoing tasks have been paused and will resume once the connection is restored.";
    }

    return (
        <div className="connection-issue-overlay">
            <div className="screen connection-issue-card">
                <span className="screen-icon text-danger">
                    <i className={`bi bi-${icon}`}></i>
                </span>
                <h2>{title}</h2>
                <p>{body}</p>
                {!issue.offline && message && (
                    <p className="connection-issue-detail text-danger">
                        {message}
                    </p>
                )}
                <Button
                    severity="primary"
                    label="Try again"
                    loading={reconnecting}
                    onClick={retry}
                />
            </div>
        </div>
    );
};

function getErrorMessage(error: Error | null) {
    if (!error) {
        return null;
    }
    if (error instanceof LoginError) {
        return error.message;
    }
    return formatError(error);
}

export default ConnectionIssueScreen;
