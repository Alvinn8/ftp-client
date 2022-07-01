export enum FolderEntryType {
    Unknown = 0,
    File,
    Directory,
    SymbolicLink
};

/**
 * A file or folder inside a folder.
 */
export default class FolderEntry {
    public readonly path: string;
    public readonly name: string;
    public readonly size: number;
    public readonly type: FolderEntryType;
    public readonly modifiedAt: string;

    constructor(path: string, name: string, size: number, type: FolderEntryType, modifiedAt: string) {
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