import { vi } from "vitest";
import FTPConnection from "../ftp/FTPConnection";

export default class TestFTPConnection implements FTPConnection {
    connect = vi.fn(async () => {});
    isConnected = vi.fn(async () => true);
    pwd = vi.fn().mockRejectedValue(new Error("Method not implemented during test."));
    cd = vi.fn().mockRejectedValue(new Error("Method not implemented during test."));
    cdup = vi.fn().mockRejectedValue(new Error("Method not implemented during test."));
    download = vi.fn(async () => new Blob([]));
    list = vi.fn().mockResolvedValue([]);
    upload = vi.fn(async () => {});
    mkdir = vi.fn(async () => {});
    rename = vi.fn(async () => {});
    delete = vi.fn(async () => {});
}