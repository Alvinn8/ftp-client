import * as ftp from "basic-ftp";
import { FTPError } from "basic-ftp";
import { createServer } from "http";
import * as ws from "ws";
import { ChunkedUploadStatus, ErrorReply, Packet, packetMap, Packets } from "../protocol/packets";
import { PassThrough } from "stream";
import { createHash } from "crypto";
import VERSION from "../protocol/version";
import { ftpPacketHandlers } from "./ftp";
import { sftpPacketHandlers } from "./sftp";
import SftpClient from "ssh2-sftp-client";

// Prevent uncaught promise rejections from crashing the application
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Promise Rejection:", reason);
    // Don't crash the backend application :)
});

const PORT = parseInt(process.env.PORT) || 8081;
const PROTOCOL_VERSION = 1;

export interface LargeDownload {
    id: string;
    path: string;
    connection: Connection<unknown>;
}

export interface ChunkedUpload {
    id: string;
    path: string;
    size: number;
    connection: Connection;
    stream: PassThrough;
    uploadPromise: Promise<ftp.FTPResponse>;
    offset: number;
    pendingChunks: number;
    maxPendingChunks: number;
    error: Error | null;
}

// TODO maybe not export?
export const largeDownloads: LargeDownload[] = [];
export const chunkedUploads: ChunkedUpload[] = [];

if (false) {
    const originalCloseWithError = ftp.FTPContext.prototype.closeWithError;
    ftp.FTPContext.prototype.closeWithError = function(error: unknown) {
        console.log("DEBUG FTPContext.closeWithError called with:", error);
        return originalCloseWithError.apply(this, arguments);
    }
    // @ts-ignore
    const originalPassToHandler = ftp.FTPContext.prototype._passToHandler;
    // @ts-ignore
    ftp.FTPContext.prototype._passToHandler = function(response: unknown) {
        if (response instanceof Error) {
            response["taskStack"] = this._task ? this._task.stack : null;
        }
        if (response instanceof Error && !String(response).includes("Command requires authentication:")) {
            console.log("DEBUG FTPContext._passToHandler called with stack ", this._task ? this._task.stack : null);
        }
        return originalPassToHandler.apply(this, arguments);
    }
}

function isSFTPError(err: any): boolean {
    return err && err.custom === true && err.code;
}

export function shouldShowErrorToUser(error: any): boolean {
    if (error instanceof FTPError) {
        return true;
    }
    if (isSFTPError(error)) {
        return true;
    }
    return Boolean(formatErrorMessage(error));
}

export function formatErrorMessage(error: any): string | null {
    if (!error) {
        return null;
    }
    if (error.code === "ECONNREFUSED") {
        return "Connection refused: " + error.toString();
    }
    if (error.code === "ECONNRESET") {
        return "Connection reset: " + error.toString();
    }
    if (error.code === "ERR_SSL_WRONG_VERSION_NUMBER") {
        return "SSL error. Please try again. (ERR_SSL_WRONG_VERSION_NUMBER)";
    }
    if (error.code === "CERT_HAS_EXPIRED") {
        return "SSL error. Please try again or contact support. (CERT_HAS_EXPIRED)";
    }
    if (error.code === "ENOTFOUND") {
        return "Please try again. (" + error + ")";
    }
    const str = error.toString().trim();
    if (str === "Error: Timeout (data socket)" || str === "Error: Timeout (control socket)") {
        return str;
    }
    if (str === "None of the available transfer strategies work. Last error response was 'FTPError: 400 Unable to find valid port'.") {
        return "Please try again later. (FTPError: 400 Unable to find valid port)";
    }
    if (str === "Error: This socket has been ended by the other party") {
        return str;
    }
    return null;
}

export async function sleep(ms: number) {
    return await new Promise(resolve => setInterval(resolve, ms));
}

const httpServer = createServer(function (req, res) {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST"
    };

    if (req.method == "GET") {
        if (req.url && req.url.startsWith("/download/")) {
            const downloadId = req.url.substring("/download/".length);
            const largeDownload = largeDownloads.find(o => o.id === downloadId);
            if (largeDownload) {
                largeDownloads.splice(largeDownloads.indexOf(largeDownload), 1);
                (async () => {
                    if (largeDownload.connection.client instanceof ftp.Client) {
                        const size = await largeDownload.connection.client.size(largeDownload.path);
                        const downloadHeaders = {
                            ...headers,
                            "Content-Length": size
                        };
                        res.writeHead(200, downloadHeaders);
                        await largeDownload.connection.client.downloadTo(res, largeDownload.path);
                        res.end();
                    } else {
                        res.writeHead(500, headers);
                        res.write("500 Unknown connection type.");
                        res.end();
                        return;
                    }
                })().catch(err => {
                    if (!largeDownload.connection.userClosed) {
                        // The connection was not closed, but we still got an unexpected error.
                        largeDownload.connection.log("Download error " + err);
                    }
                });
                return;
            }
            res.writeHead(404, headers);
            res.write("404 download id not found");
            res.end();
            return;
        }
        res.writeHead(200, headers);
        res.write("Server is up. Version is " + VERSION);
        res.end();
    } else if (req.method == "OPTIONS") {
        res.writeHead(204, headers);
        res.end();
    } else {
        res.writeHead(405);
        res.end();
    }
});

const server = new ws.Server({ server: httpServer });

httpServer.listen(PORT);

server.on("listening", function() {
    console.log("Started WebSocket server on port " + PORT);
});

// Graceful shutdown handling
const gracefulShutdown = () => {
    console.log("Shutting down gracefully...");
    
    // Close all WebSocket connections
    server.clients.forEach((client) => {
        client.close();
    });
    
    // Close the HTTP server
    httpServer.close(() => {
        console.log("Server closed");
        process.exit(0);
    });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

server.on("connection", function(ws) {
    let connection: Connection = null;
    let userClosed = false;
    
    ws.on("message", function(rawMessage) {
        let message: string;
        if (typeof rawMessage == "string") {
            message = rawMessage;
        } else if (rawMessage instanceof Buffer) {
            message = rawMessage.toString();
        }
        if (connection == null) {
            // The connection is still handshaking
            if (message.startsWith("handshake json " + PROTOCOL_VERSION)) {
                connection = new Connection(ws);
                connection.log("New successfull handshake.");
            } else {
                ws.send("Error, incompatible protocol type or version. Expected \"" + "handshake json " + PROTOCOL_VERSION + "\", got \"" + message + "\"");
                ws.close();
            }
        } else {
            let json = JSON.parse(message);
            if (typeof json.packetId == "number") {
                const packetId: number = json.packetId;
                connection.log("Got packet id: " + packetId);

                // Get the packet
                const packet = packetMap.get(packetId);
                if (packet != null && packet !== Packets.Ping && packet !== Packets.ConnectFtp && packet !== Packets.ConnectSftp) {
                    // Ensure the client is connected before attempting to interact.
                    if (!connection.isClientConnected()) {
                        const requestId = json["requestId"];
                        if (requestId != null) {
                            const response: ErrorReply = {
                                action: "error",
                                type: "Error",
                                message: "Not connected",
                            };
                            response["requestId"] = requestId;
                            if (connection) {
                                connection.sendJson(response);
                            }
                        }
                        return;
                    }
                }
                // Get the packet handler
                let handler: <Data, Response> (packet: Packet<Data, Response>, data: Data, connection: Connection) => Promise<Response> | Response;
                if (connection.client instanceof ftp.Client || packet === Packets.ConnectFtp) {
                    handler = ftpPacketHandlers.map.get(packet);
                } else {
                    handler = sftpPacketHandlers.map.get(packet);
                }
                if (!handler) {
                    handler = genericPacketHandlers.map.get(packet);
                }
                // If they exist...
                if (packet != null && handler != null) {
                    // ...call the handler
                    // If the handler is an async function it returns a promise. Otherwise we wrap
                    // it. Either way, we now have a promise.
                    const promise = Promise.resolve(handler(packet, json, connection));

                    // Check if the client is awaiting a response from the server
                    const requestId = json["requestId"];
                    if (requestId != null) {
                        // If they are, when the handler is complete...
                        promise.then((response) => {
                            if (response == null) response = {};

                            // ... then send the response back to the client with the
                            // same request id so the client can handle the response.
                            response["requestId"] = requestId;
                            if (connection) {
                                connection.sendJson(response);
                            }
                        }, (err) => {
                            // Handle errors
                            let response: ErrorReply | null = null;
                            const message = formatErrorMessage(err);
                            if (message) {
                                response = {
                                    action: "error",
                                    type: "Error",
                                    message
                                };
                            } else if (err instanceof FTPError) {
                                response = {
                                    action: "error",
                                    type: "FTPError",
                                    message: err.message,
                                    code: err.code,
                                };
                            } else if (isSFTPError(err)) {
                                response = {
                                    action: "error",
                                    type: "SFTPError",
                                    message: err.message,
                                    code: err.code,
                                };
                            } else {
                                response = {
                                    action: "error",
                                    type: "Error",
                                    message: `Internal server error (${createHash('md5').update(String(err)).digest("hex")})`
                                };
                            }
                            response["requestId"] = requestId;
                            if (connection) {
                                connection.sendJson(response);
                            }
                        });
                    }

                    promise.catch((err) => {
                        if (shouldShowErrorToUser(err)) {
                            // This error has already been displayed to the user.
                            return;
                        }
                        if (userClosed) {
                            // The user closed the tab during a task. The error is probably related to
                            // that. Do not report it.
                            return;
                        }
                        console.error(`[${connection ? connection.id : '?'}] Non ftp error in packet handler with error hash ${createHash('md5').update(String(err)).digest("hex")}}`);
                        console.error(err);
                    });
                }
            }
        }
    });

    ws.on("close", function() {
        if (connection != null && connection.isClientConnected()) {
            connection.log("Left, disconnecting client");
            try {
                // Mark the connection as closed to avoid reporting errors.
                userClosed = true;
                connection.userClosed = true;
                if (connection.client instanceof ftp.Client) {
                    connection.client.close();
                } else if (connection.client instanceof SftpClient) {
                    connection.client.end().catch(err => {
                        connection.log("Error disconnecting SFTP: " + err.message);
                    });
                }
            } catch (err) {
                connection.log("Disconected during a task: " + err.message);
            }
            for (let i = chunkedUploads.length - 1; i >= 0; i--) {
                const chunkedUpload = chunkedUploads[i];
                if (chunkedUpload.connection === connection) {
                    chunkedUpload.stream.destroy();
                    chunkedUploads.splice(i, 1);
                }
            }
        }
        connection = null;
    });
});

let nextId = 1;
export class Connection<T = unknown> {
    public readonly id = nextId++;
    public readonly ws: ws;
    public userClosed: boolean = false;
    client: T;

    constructor(ws: ws) {
        this.ws = ws;
    }

    log(msg: string) {
        console.log(`[${this.id}] ${msg}`);
    }

    sendJson(json: object) {
        this.ws.send(JSON.stringify(json));
    }

    isClientConnected() {
        return this.client != null && ((this.client instanceof ftp.Client && !this.client.closed) || this.client instanceof SftpClient);
    }
}

export function newPacketHandlersMap<T>() {
    const map = new Map< Packet<any, any>, <Data, Response>(packet: Packet<Data, Response>, data: Data, connection: Connection) => Promise<Response> | Response >();
    function push<Data, Response>(packet: Packet<Data, Response>, handler: (packet: Packet<Data, Response>, data: Data, connection: Connection<T>) => Promise<Response> | Response) {
        // @ts-ignore
        map.set(packet, handler);
    }
    return {
        map,
        push
    }
}

const genericPacketHandlers = newPacketHandlersMap();

const handler = genericPacketHandlers.push;

handler(Packets.ChunkedUpload, async (packet, data, connection) => {
    type Status = ChunkedUploadStatus;

    const chunkedUpload = chunkedUploads.find(u => u.id === data.uploadId);
    if (!chunkedUpload) {
        return { status: "404" as Status };
    }
    if (chunkedUpload.connection !== connection) {
        return { status: "hijack" as Status };
    }

    if (chunkedUpload.error) {
        const message = shouldShowErrorToUser(chunkedUpload.error) && formatErrorMessage(chunkedUpload.error) || "An error occured.";
        return {
            status: "error" as Status,
            error: message
        };
    }

    const buffer = Buffer.from(data.data, "base64");
    if (buffer.byteLength !== data.end - data.start) {
        return { status: "malsized" as Status };
    }

    if (chunkedUpload.offset !== data.start) {
        return { status: "desync" as Status };
    }

    chunkedUpload.pendingChunks++;
    chunkedUpload.stream.write(buffer, (err) => {
        if (err) {
            chunkedUpload.error = err;
        }
        chunkedUpload.pendingChunks--;
    });

    if (chunkedUpload.pendingChunks > 1) {
        connection.log("pendingChunks = " + chunkedUpload.pendingChunks);
    }

    let sleepCount = 0;
    while (chunkedUpload.pendingChunks >= chunkedUpload.maxPendingChunks && sleepCount++ < 1000) {
        // We have a few chunks in the queue now. We can wait a little.
        await sleep(50);
    }

    if (sleepCount > 0) {
        connection.log("slept " + sleepCount + " times, pendingChunks = " + chunkedUpload.pendingChunks);
    }

    chunkedUpload.offset += buffer.length;

    if (chunkedUpload.offset === chunkedUpload.size) {
        chunkedUpload.stream.end();
        await chunkedUpload.uploadPromise;
        chunkedUploads.splice(chunkedUploads.indexOf(chunkedUpload), 1);
        return { status: "end" as Status };
    }

    return { status: "success" as Status };
});

handler(Packets.ChunkedUploadStop, async (packet, data, connection) => {
    const chunkedUpload = chunkedUploads.find(u => u.id === data.uploadId);
    if (!chunkedUpload) {
        return;
    }
    if (chunkedUpload.connection !== connection) {
        return;
    }

    chunkedUpload.stream.end();
    await chunkedUpload.uploadPromise;
    chunkedUploads.splice(chunkedUploads.indexOf(chunkedUpload), 1);
});
