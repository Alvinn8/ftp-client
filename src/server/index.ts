import * as ftp from "basic-ftp";
import { FTPError } from "basic-ftp";
import { createServer } from "http";
import * as ws from "ws";
import { ErrorReply, ListReply, Packet, packetMap, Packets } from "../protocol/packets";
import { WritableMemoryStream, ReadableMemoryStream } from "./memoryStreams";


const PORT = parseInt(process.env.PORT) || 8081;
const PROTOCOL_VERSION = 1;

type ProtocolType = "json";

const LARGE_FILE_THRESHOLD = 10E6; // 10 MB

interface LargeDownload {
    id: string;
    path: string;
    connection: Connection;
}

interface LargeUpload {
    id: string;
    path: string;
    connection: Connection;
}

const largeDownloads: LargeDownload[] = [];
const largeUploads: LargeUpload[] = [];

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
                    const size = await largeDownload.connection.ftp.size(largeDownload.path);
                    const downloadHeaders = {
                        ...headers,
                        "Content-Length": size
                    };
                    res.writeHead(200, downloadHeaders);
                    await largeDownload.connection.ftp.downloadTo(res, largeDownload.path);
                    res.end();
                })();
                return;
            }
            res.writeHead(404, headers);
            res.write("404 download id not found");
            res.end();
            return;
        }
        res.writeHead(200, headers);
        res.write("pong");
        res.end();
    } else if (req.method === "POST") {
        if (req.url && req.url.startsWith("/upload/")) {
            const uploadId = req.url.substring("/upload/".length);
            const largeUpload = largeUploads.find(o => o.id === uploadId);
            if (largeUpload) {
                largeUploads.splice(largeUploads.indexOf(largeUpload), 1);
                (async () => {
                    await largeUpload.connection.ftp.uploadFrom(req, largeUpload.path);
                    res.writeHead(201, headers);
                    res.end();
                })();
                return;
            }
        }
        res.writeHead(404, headers);
        res.write("404 upload id not found");
        res.end();
        return;
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

server.on("connection", function(ws) {
    let connection: Connection = null;
    
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
                connection = new Connection(ws, "json");
                connection.log("New successfull handshake.");
            } else {
                ws.send("Error, incompatible protocol type or version. Expected \"" + "handshake json " + PROTOCOL_VERSION + "\", got \"" + message + "\"");
                ws.close();
            }
        } else {
            if (connection.protocolType == "json") {
                let json = JSON.parse(message);
                if (typeof json.packetId == "number") {
                    const packetId: number = json.packetId;
                    connection.log("Got packet id: " + packetId);

                    // Get the packet and it's handler
                    const packet = packetMap.get(packetId);
                    const handler = packetHandlers.get(packet);
                    // If they exist...
                    if (packet != null && handler != null) {
                        // ...call the handler
                        const promise = handler(packet, json, connection);

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
                            });

                            // Handle errors
                            promise.catch((err) => {
                                const response: ErrorReply = {
                                    action: "error",
                                    message: err instanceof FTPError ? err.toString() : "Internal server error"
                                };
                                response["requestId"] = requestId;
                                if (connection) {
                                    connection.sendJson(response);
                                }
                            });
                        }

                        promise.catch((err) => {
                            if (!(err instanceof FTPError) && "Error: Client is closed" != (err + "")) {
                                console.error("Non ftp error in packet handler");
                                console.error(err);
                            }
                        });
                    }
                }
            }
        }
    });

    ws.on("close", function() {
        if (connection != null && connection.ftp != null && !connection.ftp.closed) {
            connection.log("Left, disconnecting ftp");
            try {
                connection.ftp.close();
            } catch (e) {
                connection.log("Disconected during a task: " + e.message);
            }
        }
        connection = null;
    });
});

let nextId = 1;
class Connection {
    public readonly id = nextId++;
    public readonly ws: ws;
    public readonly protocolType: ProtocolType;
    public ftp: ftp.Client;

    constructor(ws: ws, protocolType: ProtocolType) {
        this.ws = ws;
        this.protocolType = protocolType;
    }

    log(msg: string) {
        console.log(`[${this.id}] ${msg}`);
    }

    sendJson(json: object) {
        if (this.protocolType != "json") throw new Error("Can not send json packet on a non json protocol type.");

        this.ws.send(JSON.stringify(json));
    }
}

const packetHandlers = new Map< Packet<any, any>, <Data, Response>(packet: Packet<Data, Response>, data: Data, connection: Connection) => Promise<Response> >();

function handler<Data, Response>(packet: Packet<Data, Response>, handler: (packet: Packet<Data, Response>, data: Data, connection: Connection) => Promise<Response>) {
    // Too many genercs here for typescript, we know what we're doing though.
    // @ts-ignore
    packetHandlers.set(packet, handler);
}

handler(Packets.Ping, async (packet, data, connection) => {
    return {
        isFTPConnected: connection.ftp == null ? false : !connection.ftp.closed
    };
});

handler(Packets.Connect, async (packet, data, connection) => {
    connection.ftp = new ftp.Client();

    await connection.ftp.access({
        host: data.host,
        port: data.port,
        user: data.username,
        password: data.password,
        secure: data.secure
    });
});

handler(Packets.List, async (packet, data, connection) => {
    const files = await connection.ftp.list(data.path);
    let response: ListReply = {
        files: []
    };
    for (const file of files) {
        response.files.push({
            name: file.name,
            size: file.size,
            type: file.type,
            rawModifiedAt: file.rawModifiedAt
        });
    }
    return response;
});

handler(Packets.PWD, async (packet, data, connection) => {
    return {
        workdir: await connection.ftp.pwd()
    };
});

handler(Packets.CD, async (packet, data, connection) => {
    await connection.ftp.cd(data.path);
});

handler(Packets.CDUP, async (packet, data, connection) => {
    await connection.ftp.cdup();
});

handler(Packets.Download, async (packet, data, connection) => {
    const size = await connection.ftp.size(data.path);
    if (size > LARGE_FILE_THRESHOLD) {
        const downloadId = Math.random().toString().substring(2);
        largeDownloads.push({
            id: downloadId,
            path: data.path,
            connection
        });
        return {
            downloadId
        };
    } else {
        const stream = new WritableMemoryStream();
        await connection.ftp.downloadTo(stream, data.path);
        // By this point the stream has finished as we awaited the download method.
        return {
            data: stream.getBuffer().toString("base64")
        };
    }
});

handler(Packets.Upload, async (packet, data, connection) => {
    const buffer = Buffer.from(data.data, "base64");
    const stream = new ReadableMemoryStream(buffer);

    await connection.ftp.uploadFrom(stream, data.path);
});

handler(Packets.LargeUpload, async (packet, data, connection) => {
    const uploadId = Math.random().toString().substring(2);

    largeUploads.push({
        id: uploadId,
        path: data.path,
        connection
    });

    return { uploadId };
});

handler(Packets.Mkdir, async (packet, data, connection) => {
    await connection.ftp.send("MKD " + data.path);
});

handler(Packets.Rename, async (packet, data, connection) => {
    await connection.ftp.rename(data.from, data.to);
});

handler(Packets.Delete, async (packet, data, connection) => {
    await connection.ftp.remove(data.path);
});