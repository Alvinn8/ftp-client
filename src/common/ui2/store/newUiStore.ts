import { create } from "zustand";

interface UseNewUiState {
    useNewUi: boolean;
    toggleUseNewUi: () => void;
}

const useNewUiStore = create<UseNewUiState>((set) => ({
    useNewUi: false,
    toggleUseNewUi: () => set((state) => ({ useNewUi: !state.useNewUi })),
}));

export { useNewUiStore };
