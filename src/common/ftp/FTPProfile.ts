import FTPSession from "./FTPSession";

/**
 * Credentials to connect to an FTP server.
 */
export default class FTPProfile {
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

    /**
     * Start a new FTPSession using this profile.
     * 
     * @returns The started session.
     */
    startSession(): FTPSession {
        return new FTPSession(this);
    }
}