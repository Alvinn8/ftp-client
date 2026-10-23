export enum FolderEntryType {
    Unknown = 0,
    File,
    Directory,
    SymbolicLink,
}

/**
 * A file or folder inside a folder.
 */
export default class FolderEntry {
    public readonly path: string;
    public readonly name: string;
    /** The size in bytes, or null if unknown. */
    public readonly size: number | null;
    public readonly type: FolderEntryType;
    /** The last modification date, or null if unknown. */
    public readonly modifiedAt: string | null;

    constructor(
        path: string,
        name: string,
        size: number | null,
        type: FolderEntryType,
        modifiedAt: string | null,
    ) {
        this.path = path;
        this.name = name;
        this.size = size;
        this.type = type;
        this.modifiedAt = modifiedAt;
    }

    isDirectory(): boolean {
        return this.type == FolderEntryType.Directory;
    }

    isSymbolicLink(): boolean {
        return this.type == FolderEntryType.SymbolicLink;
    }

    isFile(): boolean {
        return this.type == FolderEntryType.File;
    }
}
