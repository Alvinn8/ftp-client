import * as React from "react";
import * as ReactDOM from "react-dom";
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

export function createContextMenu(populator: ContextMenuPopulator, x: number, y: number) {
    console.log("Creating context menu at ", x, y);
    const element = document.createElement("div");
    element.style.position = "fixed";
    element.style.left = x + "px";
    element.style.top = y + "px";
    document.body.appendChild(element);

    ReactDOM.render(<ContextMenu populator={ populator } />, element);
    setContextMenu({
        container: element
    });

    // If the element is outside of the screen, move it in to the screen
    const box = element.firstElementChild.getBoundingClientRect();
    if (box.bottom > document.body.clientHeight) {
        element.style.top = document.body.clientHeight - box.height + "px";
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