import { create } from "zustand";
import { ensureAbsolute } from "../../utils";
import { useSelection } from "./selectionStore";

interface PathState {
    path: string;
    setPath: (p: string) => void;
}

const usePath = create<PathState>((set) => ({
    path: "/",
    setPath: (p: string) => {
        ensureAbsolute(p);
        if (!p.endsWith("/")) {
            p += "/";
        }
        set({ path: p });
        // Clear selection when changing path
        useSelection.getState().clear();
    },
}));

export { usePath };
