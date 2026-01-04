import * as ftp from "basic-ftp";
import { ChunkedUpload, chunkedUploads, CORS_HEADERS, largeDownloads, newPacketHandlersMap, ServerPackets } from ".";
import { Packets, ListReply } from "../protocol/packets";
import { WritableMemoryStream, ReadableMemoryStream } from "./memoryStreams";
import { PassThrough } from "stream";

export const ftpPacketHandlers = newPacketHandlersMap<ftp.Client>();

const handler = ftpPacketHandlers.push;

handler(Packets.Ping, (packet, data, connection) => {
    return {
        isConnected: connection.client == null ? false : !connection.client.closed
    };
});

handler(ServerPackets.IsConnected, (packet, data, connection) => {
    return {
        isConnected: connection.client == null ? false : !connection.client.closed
    };
});

handler(ServerPackets.Disconnect, (packet, data, connection) => {
    if (connection.client) {
        connection.client.close();
        connection.client = null;
    }
});

handler(Packets.ConnectFtp, async (packet, data, connection) => {
    connection.client = new ftp.Client();

    await connection.client.access({
        host: data.host,
        port: data.port,
        user: data.username,
        password: data.password,
        secure: data.secure
    });
});

handler(Packets.Connect, async (packet, data, connection) => {
    connection.client = new ftp.Client();

    await connection.client.access({
        host: data.host,
        port: data.port,
        user: data.username,
        password: data.password,
        secure: data.secure
    });
    return {
        readOnly: false
    };
});

handler(Packets.List, async (packet, data, connection) => {
    const files = await connection.client.list(data.path);
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

handler(Packets.Download, async (packet, data, connection) => {
    if (data.largeDownload) {
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
        await connection.client.downloadTo(stream, data.path);
        // By this point the stream has finished as we awaited the download method.
        return {
            data: stream.getBuffer().toString("base64")
        };
    }
});

handler(ServerPackets.LargeDownload, async (packet, data, connection) => {
    const { largeDownload, response } = data;
    const size = await connection.client.size(largeDownload.path);
    const downloadHeaders = {
        ...CORS_HEADERS,
        "Content-Length": size
    };
    response.writeHead(200, downloadHeaders);

    // Handle response stream errors to prevent crash
    response.on("error", (err) => {
        connection.log("Response stream error: " + err.message);
    });

    await connection.client.downloadTo(response, largeDownload.path);
    response.end();
});

handler(Packets.Upload, async (packet, data, connection) => {
    const buffer = Buffer.from(data.data, "base64");
    const stream = new ReadableMemoryStream(buffer);

    await connection.client.uploadFrom(stream, data.path);
});

handler(Packets.ChunkedUploadStart, (packet, data, connection) => {
    const uploadId = Math.random().toString().substring(2);
    const stream = new PassThrough();

    const chunkedUpload = {
        id: uploadId,
        path: data.path,
        size: data.size,
        connection,
        stream,
        uploadPromise: null,
        offset: data.startOffset !== null ? data.startOffset : 0,
        pendingChunks: 0,
        maxPendingChunks: 2,
        error: null
    } satisfies Partial<ChunkedUpload>;

    const uploadPromise = (data.startOffset !== null
        ? connection.client.appendFrom(stream, data.path)
        : connection.client.uploadFrom(stream, data.path)).catch(err => {
            chunkedUpload.error = err;
        });
    
    chunkedUpload.uploadPromise = uploadPromise;

    chunkedUploads.push(chunkedUpload);

    return { uploadId };
});

handler(Packets.Mkdir, async (packet, data, connection) => {
    await connection.client.send("MKD " + data.path);
});

handler(Packets.Rename, async (packet, data, connection) => {
    await connection.client.rename(data.from, data.to);
});

handler(Packets.Delete, async (packet, data, connection) => {
    await connection.client.remove(data.path);
});
