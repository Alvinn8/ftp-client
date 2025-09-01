import * as ftp from "basic-ftp";
import { ChunkedUpload, chunkedUploads, Connection, largeDownloads, newPacketHandlersMap, showErrorToUser, sleep } from ".";
import { Packet, Packets, ChunkedUploadStatus, ListReply } from "../protocol/packets";
import { WritableMemoryStream, ReadableMemoryStream } from "./memoryStreams";
import { PassThrough } from "stream";

export const ftpPacketHandlers = newPacketHandlersMap();

function handler<Data, Response>(packet: Packet<Data, Response>, handler: (packet: Packet<Data, Response>, data: Data, connection: Connection<ftp.Client>) => Promise<Response> | Response) {
    // @ts-ignore
    ftpPacketHandlers.set(packet, handler);
}

handler(Packets.Ping, (packet, data, connection) => {
    return {
        isConnected: connection.client == null ? false : !connection.client.closed
    };
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
        return {
            status: "error" as Status,
            error: showErrorToUser(chunkedUpload.error)
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

handler(Packets.Mkdir, async (packet, data, connection) => {
    await connection.client.send("MKD " + data.path);
});

handler(Packets.Rename, async (packet, data, connection) => {
    await connection.client.rename(data.from, data.to);
});

handler(Packets.Delete, async (packet, data, connection) => {
    await connection.client.remove(data.path);
});
