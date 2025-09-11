export type Profile = FTPProfile | SFTPProfile;

/**
 * Credentials to connect to an FTP server.
 */
export class FTPProfile {
    public readonly protocol = "ftp";
    public readonly host: string;
    public readonly port: number;
    public readonly username: string;
    public readonly password: string;
    public readonly secure: boolean;

    constructor(host: string, port: number, username: string, password: string, secure: boolean) {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
        this.secure = secure;
    }
}

export class SFTPProfile {
    public readonly protocol = "sftp";
    public readonly host: string;
    public readonly port: number;
    public readonly username: string;
    public readonly password: string;

    constructor(host: string, port: number, username: string, password: string) {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
    }
}