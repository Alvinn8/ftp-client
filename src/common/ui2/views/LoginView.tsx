import React, { useState, useEffect, useMemo } from "react";
import Button from "../components/elements/Button";
import TextInput from "../components/elements/TextInput";
import Checkbox from "../components/elements/Checkbox";
import { Profile } from "../../ftp/profile";
import { useSession } from "../store/sessionStore";
import FTPSession from "../../ftp/FTPSession";
import "./loginView.css";
import { formatError, LoginError, unexpectedErrorHandler } from "../../error";
import { getConfig, isHostAllowed, ProtocolConfig } from "../../config/config";
import ConnectingScreen from "../../ui/ConnectingScreen";
import ErrorScreen from "../../ui/ErrorScreen";
import { performWithRetry } from "../../task/taskActions";

enum ConnectionState {
    LOADING,
    IDLE,
    CONNECTING,
    ERROR,
}

const LoginView: React.FC = () => {
    const setSession = useSession((state) => state.setSession);
    const config = getConfig();

    // Get enabled protocols from config
    const enabledProtocols = useMemo(() => {
        return Object.entries(config.protocols)
            .filter(([_, protocolConfig]) => protocolConfig.enabled)
            .map(([key, protocolConfig]) => ({
                key,
                config: protocolConfig,
            }));
    }, [config]);

    // Initialize with the first enabled protocol
    const [protocol, setProtocol] = useState<string>(
        enabledProtocols.length > 0 ? enabledProtocols[0].key : "ftp",
    );

    const [formData, setFormData] = useState<Record<string, any>>({});
    const [connectionState, setConnectionState] = useState<ConnectionState>(
        ConnectionState.LOADING,
    );
    const [error, setError] = useState<string | null>(null);

    const currentProtocolConfig = config.protocols[protocol];

    // Initialize form data with defaults when protocol changes
    useEffect(() => {
        if (!currentProtocolConfig) return;

        const initialData: Record<string, any> = {};
        currentProtocolConfig.fields.forEach((field) => {
            if (field.default !== undefined) {
                initialData[field.name] = field.default;
            } else if (field.type === "string") {
                initialData[field.name] = "";
            } else if (field.type === "number") {
                initialData[field.name] = "";
            } else if (field.type === "boolean") {
                initialData[field.name] = false;
            }
        });
        setFormData(initialData);
    }, [protocol, currentProtocolConfig]);

    // Extract parameters from URL on mount
    useEffect(() => {
        const url = new URL(location.href);
        const urlProtocol = url.searchParams.get("protocol") || "ftp";
        if (!urlProtocol) {
            setConnectionState(ConnectionState.IDLE);
            return;
        }

        // Check if protocol is valid and enabled
        const protocolConfig = config.protocols[urlProtocol];
        if (!protocolConfig) {
            if (url.searchParams.has("protocol")) {
                setError(`Protocol "${urlProtocol}" is not supported.`);
            }
            setConnectionState(ConnectionState.ERROR);
            return;
        }
        if (!protocolConfig.enabled) {
            setError(`Protocol "${urlProtocol}" is not enabled.`);
            setConnectionState(ConnectionState.ERROR);
            return;
        }
        setProtocol(urlProtocol);
        // Extract field values from URL
        const urlData: Record<string, any> = {};
        protocolConfig.fields.forEach((field) => {
            const value = url.searchParams.get(field.name);
            if (value !== null) {
                if (field.type === "number") {
                    urlData[field.name] = parseInt(value);
                } else if (field.type === "boolean") {
                    urlData[field.name] = value === "true";
                } else {
                    urlData[field.name] = value;
                }
            } else if (field.default !== undefined) {
                urlData[field.name] = field.default;
            }
        });

        const hasAllRequired = protocolConfig.fields
            .filter((field) => !field.optional)
            .every(
                (field) =>
                    urlData[field.name] !== undefined &&
                    urlData[field.name] !== "",
            );

        if (hasAllRequired) {
            setFormData((prev) => ({ ...prev, ...urlData }));
            performLogin(urlProtocol, urlData).catch(
                unexpectedErrorHandler("Auto Login Error"),
            );
            // Clear credentials from URL
            url.search = "";
            window.history.replaceState(null, "", url.href);
        } else if (Object.keys(urlData).length > 0) {
            // Set partial data from URL
            setFormData((prev) => ({ ...prev, ...urlData }));
            setConnectionState(ConnectionState.IDLE);
        }
    }, []);

    async function performLogin(protocol: string, data: Record<string, any>) {
        setError(null);
        setConnectionState(ConnectionState.CONNECTING);

        try {
            const protocolConfig = config.protocols[protocol];
            if (!protocolConfig || !protocolConfig.enabled) {
                throw new Error(`Protocol "${protocol}" is not enabled.`);
            }

            // Validate required fields
            for (const field of protocolConfig.fields) {
                if (
                    !field.optional &&
                    (data[field.name] === undefined || data[field.name] === "")
                ) {
                    throw new Error(`Missing required field: ${field.label}`);
                }
            }

            // Check host filter
            const host = data.host;
            if (typeof host === "string" && !isHostAllowed(host)) {
                throw new Error(`Connection to host "${host}" is not allowed.`);
            }

            let profile: Profile = { protocol };
            protocolConfig.fields.forEach((field) => {
                profile[field.name] = data[field.name];
            });

            const session = new FTPSession(profile);
            await session.getConnectionPool().createInitialConnection();
            const list = await performWithRetry(
                session,
                "/",
                async (connection) => await connection.list("/"),
            );
            session.folderCache.set("/", list);
            setSession(session);
        } catch (err) {
            if (err instanceof LoginError) {
                setError(err.message);
            } else {
                setError(formatError(err));
            }
            setConnectionState(ConnectionState.ERROR);
        }
    }

    function handleLogin() {
        performLogin(protocol, formData).catch(
            unexpectedErrorHandler("Login Error"),
        );
    }

    function updateField(fieldName: string, value: any) {
        setFormData((prev) => ({ ...prev, [fieldName]: value }));
    }

    // Render form field based on field config
    function renderField(field: ProtocolConfig["fields"][0]) {
        const value = formData[field.name] ?? "";

        if (field.type === "boolean") {
            return (
                <div key={field.name} className="form-group">
                    <div className="checkbox-group">
                        <Checkbox
                            checked={!!formData[field.name]}
                            onChange={(checked) =>
                                updateField(field.name, checked)
                            }
                            disabled={
                                connectionState === ConnectionState.CONNECTING
                            }
                        />
                        <label
                            className="form-group-label"
                            style={{ cursor: "pointer", margin: 0 }}
                        >
                            {field.label}
                        </label>
                    </div>
                </div>
            );
        }

        return (
            <TextInput
                key={field.name}
                label={field.label}
                type={
                    field.name === "password"
                        ? "password"
                        : field.type === "number"
                          ? "number"
                          : "text"
                }
                value={String(value)}
                onChange={(val) =>
                    updateField(
                        field.name,
                        field.type === "number"
                            ? val
                                ? parseInt(val)
                                : ""
                            : val,
                    )
                }
                placeholder={field.placeholder?.toString() || ""}
                required={!field.optional}
                disabled={connectionState === ConnectionState.CONNECTING}
            />
        );
    }

    // Group fields for special layout (host and port together)
    function renderFields() {
        const fields = currentProtocolConfig?.fields || [];
        const hostField = fields.find((f) => f.name === "host");
        const portField = fields.find((f) => f.name === "port");
        const otherFields = fields.filter(
            (f) => f.name !== "host" && f.name !== "port",
        );

        const elements: JSX.Element[] = [];

        // Render host and port together if both exist
        if (hostField && portField) {
            elements.push(
                <div key="host-port" className="form-group-row">
                    {renderField(hostField)}
                    {renderField(portField)}
                </div>,
            );
        } else {
            if (hostField) elements.push(renderField(hostField));
            if (portField) elements.push(renderField(portField));
        }

        // Render other fields
        otherFields.forEach((field) => {
            elements.push(renderField(field));
        });

        return elements;
    }

    // Prevent flash of login form when loading
    if (connectionState === ConnectionState.LOADING) {
        return null;
    }

    // Show connecting screen
    if (connectionState === ConnectionState.CONNECTING) {
        return (
            <ConnectingScreen
                title="Connecting"
                body="Connecting to your files..."
            />
        );
    }

    // Show error screen
    if (connectionState === ConnectionState.ERROR) {
        let errorAction: { label: string; onClick: () => void } | null = null;

        // Check if we should offer "Continue without encryption"
        if (
            error &&
            error.includes("SSL error") &&
            protocol === "ftp" &&
            formData.secure === true
        ) {
            errorAction = {
                label: "Continue without encryption",
                onClick: () => {
                    const newData = { ...formData, secure: false };
                    setFormData(newData);
                    performLogin(protocol, newData).catch(
                        unexpectedErrorHandler("Retry Login Error"),
                    );
                },
            };
        }

        return (
            <ErrorScreen
                title="Failed to connect"
                body={error || "An unexpected error occurred."}
                action={errorAction}
            />
        );
    }

    // Show login form
    return (
        <div className="login-view">
            <div className="login-container">
                <div className="login-header">
                    <h1 className="login-title">{config.branding.appName}</h1>
                    <p className="login-subtitle">
                        Sign in to your FTP or SFTP server
                    </p>
                </div>

                <form
                    className="login-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleLogin();
                    }}
                >
                    {enabledProtocols.length > 1 && (
                        <div className="form-group">
                            <label className="form-group-label">Protocol</label>
                            <select
                                className="protocol-select"
                                value={protocol}
                                onChange={(e) => setProtocol(e.target.value)}
                            >
                                {enabledProtocols.map(({ key, config }) => (
                                    <option key={key} value={key}>
                                        {config.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {renderFields()}

                    <div className="login-actions">
                        <Button
                            label="Sign In"
                            severity="primary"
                            onClick={handleLogin}
                        />
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginView;
