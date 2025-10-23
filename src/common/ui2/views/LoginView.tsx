import React from "react";
import Button from "../components/elements/Button";
import { FTPProfile, Profile, SFTPProfile } from "../../ftp/profile";
import { useSession } from "../store/sessionStore";
import FTPSession from "../../ftp/FTPSession";

const LoginView: React.FC = () => {
    const setSession = useSession((state) => state.setSession);

    function login() {
        let url = new URL(location.href);
        const protocol = url.searchParams.get("protocol") || "ftp";
        const host = url.searchParams.get("host");
        const port = parseInt(url.searchParams.get("port") || "21");
        const username = url.searchParams.get("username");
        const password = url.searchParams.get("password");
        const secure = url.searchParams.get("secure") === "true";

        if (!host || !username || !password) {
            alert("Missing required login parameters.");
            return;
        }

        let profile: Profile;
        if (protocol === "ftp") {
            profile = new FTPProfile(host, port, username, password, secure);
        } else if (protocol === "sftp") {
            profile = new SFTPProfile(host, port, username, password);
        } else {
            alert("Unsupported protocol.");
            return;
        }
        const session = new FTPSession(profile);
        setSession(session);
    }

    return (
        <div>
            <h2>Login View</h2>
            <Button severity="primary" label="Login" onClick={() => login()} />
        </div>
    );
};

export default LoginView;
