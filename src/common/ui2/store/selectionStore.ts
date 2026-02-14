import { create } from "zustand";
import FolderEntry from "../../folder/FolderEntry";
import { parentdir } from "../../utils";

interface SelectionState {
    selectedEntries: FolderEntry[];
    toggle: (entry: FolderEntry) => void;
    clear: () => void;
    setSelection(entries: FolderEntry[]): void;
    handleClick(
        entry: FolderEntry,
        entries: FolderEntry[],
        e: React.MouseEvent,
        multiSelect: boolean,
    ): void;
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
    handleClick(
        entry: FolderEntry,
        entries: FolderEntry[],
        e: React.MouseEvent,
        multiSelect: boolean,
    ) {
        e.preventDefault();
        const selectedEntries = get().selectedEntries;
        if (e.shiftKey && selectedEntries.length > 0) {
            // Find index of last selected item and current item
            const lastSelected = selectedEntries[selectedEntries.length - 1];
            const lastIndex = entries.indexOf(lastSelected);
            const currentIndex = entries.indexOf(entry);

            // Select all items between last selected and current
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            const toSelect = entries.slice(start, end + 1);

            const newSelection = selectedEntries.slice();

            for (const entry of toSelect) {
                if (!newSelection.includes(entry)) {
                    newSelection.push(entry);
                }
            }
            get().setSelection(newSelection);
        } else if (
            selectedEntries.length > 0 &&
            !(e.metaKey || e.ctrlKey || e.altKey || multiSelect)
        ) {
            if (selectedEntries.includes(entry)) {
                get().clear();
            } else {
                get().setSelection([entry]);
            }
        } else {
            get().toggle(entry);
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
            console.log(
                "Invalid selection:",
                entries.map((e) => e.path),
            );
            throw new Error(
                `All selected entries must be in the same directory`,
            );
        }
    }
    return entries;
}

export { useSelection };
