import { FileType } from "basic-ftp";
import { ChunkedUpload, chunkedUploads, largeDownloads, newPacketHandlersMap } from ".";
import { ListReply, Packets } from "../protocol/packets";
import SftpClient from "ssh2-sftp-client";
import { ReadableMemoryStream, WritableMemoryStream } from "./memoryStreams";
import { PassThrough } from "stream";

type WriteStream = ReturnType<SftpClient["createWriteStream"]>;

async function writeToStream(stream: WriteStream, input: NodeJS.ReadableStream) {
    return await new Promise<void>((resolve, reject) => {
        stream.on('error', (err: unknown) => {
            reject(new Error("Error in writeToStream", { cause: err }));
        });
        stream.on('close', () => {
            resolve();
        });
        input.pipe(stream);
    });
}

export const sftpPacketHandlers = newPacketHandlersMap<SftpClient>();

const handler = sftpPacketHandlers.push;

handler(Packets.Ping, async (packet, data, connection) => {
    if (!connection.client) {
        return { isConnected: false };
    }
    try {
        await connection.client.stat(".");
        return { isConnected: true };
    } catch (error) {
        console.log(error);
        return { isConnected: false };
    }
});

handler(Packets.ConnectSftp, async (packet, data, connection) => {
    connection.client = new SftpClient();

    await connection.client.connect({
        host: data.host,
        port: data.port,
        username: data.username,
        password: data.password
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
            type: file.type === "d" ? FileType.Directory
            : file.type === "-" ? FileType.File
            : file.type === "l" ? FileType.SymbolicLink
            : FileType.Unknown,
            rawModifiedAt: String(file.modifyTime)
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
        await connection.client.get(data.path, stream);
        // By this point the stream has finished as we awaited the download method.
        return {
            data: stream.getBuffer().toString("base64")
        };
    }
});

handler(Packets.Upload, async (packet, data, connection) => {
    const buffer = Buffer.from(data.data, "base64");

    await connection.client.put(buffer, data.path);
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

    const writeStream = connection.client.createWriteStream(data.path, {
        start: data.startOffset !== null ? data.startOffset : undefined,
    });
    const uploadPromise = writeToStream(writeStream, stream).catch(err => {
        chunkedUpload.error = err;
    });
    
    chunkedUpload.uploadPromise = uploadPromise;

    chunkedUploads.push(chunkedUpload);

    return { uploadId };
});

handler(Packets.Mkdir, async (packet, data, connection) => {
    await connection.client.mkdir(data.path);
});

handler(Packets.Rename, async (packet, data, connection) => {
    await connection.client.rename(data.from, data.to);
});

handler(Packets.Delete, async (packet, data, connection) => {
    await connection.client.delete(data.path);
});
