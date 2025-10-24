import FTPSession from "../../ftp/FTPSession";
import { create } from "zustand";
import { useNewUiStore } from "./newUiStore";
import { getApp } from "../../ui/App";

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

function getSession(): FTPSession {
    if (useNewUiStore.getState().useNewUi) {
        let s = useSession.getState().getSession();
        console.log("Got session from new store:", s);
        return s;
    }
    return getApp().state.session;
}

export { useSession, getSession };
