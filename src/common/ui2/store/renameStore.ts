import { create } from "zustand";
import FolderEntry from "../../folder/FolderEntry";
import { useEffect, useState } from "react";

interface RenameStore {
    renaming: {
        entry: FolderEntry;
        creating: "file" | "directory" | null;
    } | null;
    setNotRenaming(): void;
    setRenaming(entry: FolderEntry): void;
    setNewItemCreating(
        entry: FolderEntry,
        type: "file" | "directory" | null,
    ): void;
}

export const useRenameStore = create<RenameStore>((set) => ({
    renaming: null,
    setNotRenaming: () =>
        set(() => ({
            renaming: null,
        })),
    setRenaming: (entry: FolderEntry) =>
        set(() => ({
            renaming: {
                entry,
                creating: null,
            },
        })),
    setNewItemCreating: (
        entry: FolderEntry,
        type: "file" | "directory" | null,
    ) =>
        set((state) => ({
            renaming: {
                entry,
                creating: type,
            },
        })),
}));

export function useRename(entry: FolderEntry) {
    const [renaming, setRenaming] = useState(false);
    const renamingStore = useRenameStore();

    useEffect(() => {
        if (renamingStore.renaming?.entry.path === entry.path) {
            setRenaming(true);
        } else {
            setRenaming(false);
        }
    }, [renamingStore, entry]);

    function set(renaming: boolean) {
        if (renaming) {
            renamingStore.setRenaming(entry);
        } else {
            renamingStore.setNotRenaming();
        }
    }

    return [renaming, set] as const;
}
