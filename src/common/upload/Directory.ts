export type SubDirectoryMap = {[key: string]: Directory};

/**
 * Represents a directory that is being uploaded by the user.
 *
 * This class is used to have a common format for a directory as the user can
 * upload them in different ways (via an input element, zip or drag and drop which
 * have very different apis).
 *
 * This class can also be used as a root for uploaded files.
 */
export default class Directory {
    public readonly files: File[] = [];
    public readonly directories: SubDirectoryMap = {};
}