import React, { useState, useEffect } from "react";
import Button from "../components/elements/Button";
import TextInput from "../components/elements/TextInput";
import Checkbox from "../components/elements/Checkbox";
import { FTPProfile, Profile, SFTPProfile } from "../../ftp/profile";
import { useSession } from "../store/sessionStore";
import FTPSession from "../../ftp/FTPSession";
import "./loginView.css";
import { formatError, unexpectedErrorHandler } from "../../error";

const LoginView: React.FC = () => {
    const setSession = useSession((state) => state.setSession);
    const [protocol, setProtocol] = useState<"ftp" | "sftp">("ftp");
    const [host, setHost] = useState("");
    const [port, setPort] = useState(protocol === "sftp" ? "22" : "21");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [secure, setSecure] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Update port when protocol changes
    useEffect(() => {
        if (protocol === "sftp" && port === "21") {
            setPort("22");
        } else if (protocol === "ftp" && port === "22") {
            setPort("21");
        }
    }, [protocol]);

    // Extract parameters from URL on mount
    useEffect(() => {
        const url = new URL(location.href);
        const urlProtocol = url.searchParams.get("protocol") || "ftp";
        const urlHost = url.searchParams.get("host");
        const urlPort = url.searchParams.get("port");
        const urlUsername = url.searchParams.get("username");
        const urlPassword = url.searchParams.get("password");
        const urlSecure = url.searchParams.get("secure") === "true";

        if (urlProtocol) setProtocol(urlProtocol as "ftp" | "sftp");
        if (urlHost) setHost(urlHost);
        if (urlPort) setPort(urlPort);
        if (urlUsername) setUsername(urlUsername);
        if (urlPassword) setPassword(urlPassword);
        if (urlSecure) setSecure(urlSecure);

        // If all parameters are present, attempt auto-login
        if (urlHost && urlUsername && urlPassword) {
            performLogin(
                urlProtocol as "ftp" | "sftp",
                urlHost,
                parseInt(urlPort || (urlProtocol === "sftp" ? "22" : "21")),
                urlUsername,
                urlPassword,
                urlSecure,
            ).catch(unexpectedErrorHandler("Auto Login Error"));
            // Clear credentials from URL
            url.search = "";
            window.history.replaceState(null, "", url.href);
        }
    }, []);

    async function performLogin(
        proto: "ftp" | "sftp",
        hostVal: string,
        portVal: number,
        userVal: string,
        passVal: string,
        secureVal: boolean,
    ) {
        setError(null);
        setLoading(true);

        try {
            if (!hostVal || !userVal || !passVal) {
                throw new Error(
                    "Missing required login parameters: host, username, and password.",
                );
            }

            let profile: Profile;
            if (proto === "ftp") {
                profile = new FTPProfile(
                    hostVal,
                    portVal,
                    userVal,
                    passVal,
                    secureVal,
                );
            } else if (proto === "sftp") {
                profile = new SFTPProfile(hostVal, portVal, userVal, passVal);
            } else {
                throw new Error("Unsupported protocol.");
            }

            const session = new FTPSession(profile);
            await session.getConnectionPool().createInitialConnection();
            setSession(session);
        } catch (err) {
            setError(formatError(err));
            setLoading(false);
        }
    }

    function handleLogin() {
        performLogin(
            protocol,
            host,
            parseInt(port) || 21,
            username,
            password,
            secure,
        ).catch(unexpectedErrorHandler("Login Error"));
    }

    return (
        <div className="login-view">
            <div className="login-container">
                <div className="login-header">
                    <h1 className="login-title">FTP Client</h1>
                    <p className="login-subtitle">
                        Sign in to your FTP or SFTP server
                    </p>
                </div>

                {error && <div className="login-error">{error}</div>}

                <form
                    className="login-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleLogin();
                    }}
                >
                    <div className="form-group">
                        <label className="form-group-label">Protocol</label>
                        <select
                            className="protocol-select"
                            value={protocol}
                            onChange={(e) =>
                                setProtocol(e.target.value as "ftp" | "sftp")
                            }
                            disabled={loading}
                        >
                            <option value="ftp">FTP</option>
                            <option value="sftp">SFTP</option>
                        </select>
                    </div>

                    <div className="form-group-row">
                        <TextInput
                            label="Host"
                            value={host}
                            onChange={setHost}
                            placeholder="example.com"
                            required
                            disabled={loading}
                        />
                        <TextInput
                            label="Port"
                            type="number"
                            value={port}
                            onChange={setPort}
                            placeholder={protocol === "sftp" ? "22" : "21"}
                            required
                            disabled={loading}
                        />
                    </div>

                    <TextInput
                        label="Username"
                        value={username}
                        onChange={setUsername}
                        placeholder="Enter your username"
                        required
                        disabled={loading}
                    />

                    <TextInput
                        label="Password"
                        type="password"
                        value={password}
                        onChange={setPassword}
                        placeholder="Enter your password"
                        required
                        disabled={loading}
                    />

                    {protocol === "ftp" && (
                        <div className="form-group">
                            <div className="checkbox-group">
                                <Checkbox
                                    checked={secure}
                                    onChange={setSecure}
                                    disabled={loading}
                                />
                                <label
                                    className="form-group-label"
                                    style={{ cursor: "pointer", margin: 0 }}
                                >
                                    Use Secure Connection (FTPS)
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="login-actions">
                        <Button
                            label="Sign In"
                            severity="primary"
                            onClick={handleLogin}
                            loading={loading}
                            disabled={loading}
                        />
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginView;
