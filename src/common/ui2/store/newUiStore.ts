import { create } from "zustand";

interface UseNewUiState {
    useNewUi: boolean;
    toggleUseNewUi: () => void;
}

const useNewUiStore = create<UseNewUiState>((set) => ({
    useNewUi: true,
    toggleUseNewUi: () => set((state) => ({ useNewUi: !state.useNewUi })),
}));

export { useNewUiStore };
