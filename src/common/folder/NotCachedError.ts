/**
 * Throws by the CacheFolderContentProvider when folder entries are not cached.
 */
export default class NotCachedError extends Error {
    constructor() {
        super();
        this.name = "NotCachedError";
    }
}