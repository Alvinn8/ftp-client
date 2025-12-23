import { MouseEvent as ReactMouseEvent } from "react";

/**
 * A clickable entry in a {@link ContextMenu}.
 * @deprecated
 */
export default interface ContextMenuEntry {
    /** The name to display for this entry. */
    name: string;
    /** The handler to run when this entry is clicked. */
    handler: (
        e: ReactMouseEvent<HTMLLIElement | HTMLButtonElement, MouseEvent>,
    ) => void;
}
