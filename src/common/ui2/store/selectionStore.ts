import { create } from "zustand";
import FolderEntry from "../../folder/FolderEntry";
import { parentdir } from "../../utils";

interface SelectionState {
    selectedEntries: FolderEntry[];
    toggle: (entry: FolderEntry) => void;
    clear: () => void;
    setSelection(entries: FolderEntry[]): void;
}

const useSelection = create<SelectionState>((set, get) => ({
    selectedEntries: [],
    toggle(entry) {
        const selectedEntries = get().selectedEntries;
        const exists = selectedEntries.some((e) => e.path === entry.path);
        if (exists) {
            set({
                selectedEntries: validateSelection(
                    selectedEntries.filter((e) => e.path !== entry.path),
                ),
            });
        } else {
            set({
                selectedEntries: validateSelection([...selectedEntries, entry]),
            });
        }
    },
    clear() {
        set({ selectedEntries: validateSelection([]) });
    },
    setSelection(entries) {
        set({ selectedEntries: validateSelection(entries) });
    },
}));

function validateSelection(entries: FolderEntry[]): FolderEntry[] {
    if (entries.length === 0) {
        return entries;
    }
    const names = new Set<string>();
    let parentPath = parentdir(entries[0].path);
    for (const entry of entries) {
        if (names.has(entry.name)) {
            throw new Error(`Duplicate entry in selection: ${entry.name}`);
        }
        names.add(entry.name);
        if (parentdir(entry.path) !== parentPath) {
            throw new Error(
                `All selected entries must be in the same directory`,
            );
        }
    }
    return entries;
}

export { useSelection };
