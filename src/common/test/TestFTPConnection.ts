import { vi } from "vitest";
import FTPConnection from "../ftp/FTPConnection";
import { ChunkedUploadResponse } from "../../protocol/packets";

export default class TestFTPConnection implements FTPConnection {
    connect = vi.fn();
    isConnected = vi.fn().mockResolvedValue(true);
    pwd = vi.fn().mockRejectedValue(new Error("Method not implemented during test."));
    cd = vi.fn().mockRejectedValue(new Error("Method not implemented during test."));
    cdup = vi.fn().mockRejectedValue(new Error("Method not implemented during test."));
    download = vi.fn().mockResolvedValue(new Blob([]));
    list = vi.fn().mockResolvedValue([]);
    upload = vi.fn();
    mkdir = vi.fn();
    rename = vi.fn();
    delete = vi.fn();
    uploadSmall = vi.fn();
    startChunkedUpload = vi.fn().mockResolvedValue("test-upload");
    uploadChunk = vi.fn();
}