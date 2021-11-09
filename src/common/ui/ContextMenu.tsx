import * as React from "react";
import ContextMenuPopulator from "../contextmenu/ContextMenuPopulator";

/**
 * Holds the container element for the context menu. The containing element should
 * be created and empty as it will be removed when the context menu is removed.
 */
export interface ContextMenuHolder {
    container: HTMLDivElement;
}

let contextMenu: ContextMenuHolder | null = null;

/**
 * Remove the current context menu if there is one.
 */
export function removeContextMenu() {
    if (contextMenu != null) {
        contextMenu.container.remove();
        contextMenu = null;
    }
}

/**
 * Get the current context menu, or null if there is none.
 *
 * @returns The context menu holder or null.
 */
export function getContextMenu(): ContextMenuHolder | null {
    return contextMenu;
}

/**
 * Set the context menu. The provided context menu holder should have a
 * {@link ContextMenu} rendered in it.
 * 
 * @param holder The context menu holder.
 */
export function setContextMenu(holder: ContextMenuHolder | null) {
    contextMenu = holder;
}

export interface ContextMenuProps {
    populator: ContextMenuPopulator;
}

/**
 * The component that renders the context menu. A {@link ContextMenuPopulator} is
 * provided via the probs and the provided context menu entries will be rendered
 * and have handlers attached to them.
 */
export class ContextMenu extends React.Component<ContextMenuProps, {}> {
    render() {
        return (
            <div className="dropdown-menu show">
                { this.props.populator.getEntries().map((value, index) => {
                    return <li className="dropdown-item" key={index} onClick={value.handler}>{ value.name }</li>;
                }) }
            </div>
        );
    }
}

window.addEventListener("click", removeContextMenu);
window.addEventListener("resize", removeContextMenu);