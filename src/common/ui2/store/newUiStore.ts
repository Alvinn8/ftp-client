import { create } from "zustand";

interface UseNewUiState {
    useNewUi: boolean;
    toggleUseNewUi: () => void;
}

const useNewUiStore = create<UseNewUiState>((set) => ({
    useNewUi: String(location.href).includes("useNewUi"),
    toggleUseNewUi: () => set((state) => ({ useNewUi: !state.useNewUi })),
}));

export { useNewUiStore };
