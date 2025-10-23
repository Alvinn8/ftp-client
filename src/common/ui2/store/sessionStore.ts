import FTPSession from "../../ftp/FTPSession";
import { create } from "zustand";

interface SessionState {
    session: FTPSession | null;
    setSession: (s: FTPSession) => void;
    getSession: () => FTPSession;
    hasSession: () => boolean;
}

const useSession = create<SessionState>((set, get) => ({
    session: null,
    setSession: (s) => set({ session: s }),
    getSession: () => {
        const s = get().session;
        if (!s) {
            throw new Error("No session available at this time.");
        }
        return s;
    },
    hasSession: () => get().session !== null,
}));

export { useSession };
