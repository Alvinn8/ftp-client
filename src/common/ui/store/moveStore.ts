import { create } from "zustand";
import FolderEntry from "@common/folder/FolderEntry";

interface MoveStore {
    /** The entries the "Move" dialog is currently picking a destination for. */
    movingEntries: FolderEntry[] | null;
    setMoving(entries: FolderEntry[]): void;
    clearMoving(): void;
}

export const useMoveStore = create<MoveStore>((set) => ({
    movingEntries: null,
    setMoving: (entries: FolderEntry[]) => set({ movingEntries: entries }),
    clearMoving: () => set({ movingEntries: null }),
}));

/**
 * The entries currently being dragged for an internal move. The drop payload is
 * stored here rather than on the DataTransfer because DataTransfer values are not
 * readable during the `dragover` event (only on `drop`), and the drop targets need
 * to know what is being dragged in order to show valid/invalid feedback.
 */
let draggedEntries: FolderEntry[] = [];

export function setDraggedEntries(entries: FolderEntry[]) {
    draggedEntries = entries;
}

export function getDraggedEntries(): FolderEntry[] {
    return draggedEntries;
}

export function clearDraggedEntries() {
    draggedEntries = [];
}
