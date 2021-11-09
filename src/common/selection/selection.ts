import FolderEntry from "../folder/FolderEntry";
import FolderEntryComponent from "../ui/FolderEntryComponent";
import { app } from "../ui/index";

/**
 * A list of folder entries in the current directory that are selected.
 */
export let selectedFiles: FolderEntry[] = [];

/**
 * A list of react components rendering folder entries.
 */
let components: FolderEntryComponent[] = [];

/**
 * Select the specified folder entry. This will update the rendered component to
 * display it as selected.
 * 
 * @param entry The entry to select.
 */
export function selectFile(entry: FolderEntry) {
    if (!selectedFiles.includes(entry)) {
        selectedFiles.push(entry);
    }
    for (const component of components) {
        if (component.props.entry == entry && !component.state.selected) {
            component.setState({
                selected: true
            });
        }
    }
    updateSelection();
}

/**
 * Unselect the specified folder entry. This will update the rendered component
 * to display it as not being selected.
 * 
 * @param entry The entry to unselect.
 */
export function unselectFile(entry: FolderEntry) {
    if (selectedFiles.includes(entry)) {
        selectedFiles.splice(selectedFiles.indexOf(entry), 1);
    }
    for (const component of components) {
        if (component.props.entry == entry && component.state.selected) {
            component.setState({
                selected: false
            });
        }
    }
    updateSelection();
}

/**
 * Update components that show information based on the selection.
 */
function updateSelection() {
    if (app.aside) app.aside.forceUpdate();
    if (app.actions) app.actions.forceUpdate();
}

/**
 * Unselect all folder entries.
 */
export function unselectAll() {
    for (const component of components) {
        if (selectedFiles.includes(component.props.entry) && component.state.selected) {
            component.setState({
                selected: false
            });
        }
    }
    selectedFiles = [];
    updateSelection();
}

/**
 * Add a react component rendering a folder entry to the list. The component will
 * be rendered as selected if it is selected via methods provided by this file.
 * 
 * @param component The react component to add.
 */
export function addComponent(component: FolderEntryComponent) {
    if (!components.includes(component)) {
        components.push(component);
    }
}

/**
 * Remove a react component rendering a folder entry, because it has been unmounted.
 *
 * @param component The react component to remove.
 */
export function removeComponent(component: FolderEntryComponent) {
    if (components.includes(component)) {
        components.splice(components.indexOf(component), 1);
    }
}