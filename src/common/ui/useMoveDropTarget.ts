import React, { useState } from "react";
import { canMoveInto, moveFolderEntries } from "@common/contextmenu/actions";
import {
    clearDraggedEntries,
    getDraggedEntries,
} from "@common/ui/store/moveStore";
import { getSession } from "@common/ui/store/sessionStore";
import { unexpectedErrorHandler } from "@common/util/error";

/** DataTransfer type marking an internal move drag (vs an OS file-upload drag). */
export const MOVE_MIME = "application/x-ftp-move";

interface MoveDropTarget {
    /** Whether a valid move drag is currently hovering this target. */
    isDropTarget: boolean;
    /** Drag event handlers to spread onto the drop target element. */
    dropProps: {
        onDragOver: (e: React.DragEvent) => void;
        onDragLeave: (e: React.DragEvent) => void;
        onDrop: (e: React.DragEvent) => void;
    };
}

/**
 * Makes an element a drop target for moving the currently dragged entries into
 * `destDir`. Returns a `isDropTarget` flag for styling and a `dropProps` object to
 * spread onto the element.
 *
 * @param destDir The directory dropped entries are moved into.
 * @param enabled Whether this element should accept drops (e.g. only directories).
 */
export function useMoveDropTarget(
    destDir: string,
    enabled: boolean = true,
): MoveDropTarget {
    const [isDropTarget, setIsDropTarget] = useState(false);

    function acceptsDrop(e: React.DragEvent): boolean {
        if (!enabled) return false;
        if (getSession().isReadOnly()) return false;
        if (!e.dataTransfer.types.includes(MOVE_MIME)) return false;
        const dragged = getDraggedEntries();
        if (dragged.some((d) => d.path === destDir)) return false;
        return canMoveInto(dragged, destDir);
    }

    return {
        isDropTarget,
        dropProps: {
            onDragOver(e) {
                if (!acceptsDrop(e)) return;
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
                setIsDropTarget(true);
            },
            onDragLeave() {
                setIsDropTarget(false);
            },
            onDrop(e) {
                setIsDropTarget(false);
                if (!acceptsDrop(e)) return;
                e.preventDefault();
                e.stopPropagation();
                moveFolderEntries(getDraggedEntries(), destDir).catch(
                    unexpectedErrorHandler("Failed to move"),
                );
                clearDraggedEntries();
            },
        },
    };
}
