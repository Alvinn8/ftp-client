import FTPSession from "../../ftp/FTPSession";
import { create } from "zustand";

interface SessionState {
    session: FTPSession | null;
    setSession: (s: FTPSession) => void;
}

const useSession = create<SessionState>((set) => ({
    session: null,
    setSession: (s) => set({ session: s }),
}))

export { useSession };