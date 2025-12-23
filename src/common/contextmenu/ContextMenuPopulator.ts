import ContextMenuEntry from "./ContextMenuEntry";

/**
 * Populates a context menu with entries. This interface is implemented by
 * different classes that provide different context menus depending on what
 * is right clicked.
 * @deprecated
 */
export default interface ContextMenuPopulator {
    /**
     * Get the entries to display.
     */
    getEntries(): ContextMenuEntry[];
}
