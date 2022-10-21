export type TextEditorWindow = Window & {
    // editorLoaded: () => void;
};

/**
 * A editor capable of editing text.
 * @deprecated
 */
export default interface TextEditor {
    /**
     * Check whether this editor is loaded in the window.
     * 
     * @param wind The editor window.
     */
    isLoaded(wind: Window): boolean;

    /**
     * Load this editor for the window so it's ready for usage.
     * 
     * @param wind The editor window.
     */
    load(wind: Window): Promise<void>;

    /**
     * Get the currently typed text.
     */
    getCurrentText(wind: Window): string;

    /**
     * Open the editor.
     * 
     * @param wind The editor window.
     * @param text The text to put in the editor.
     * @param absolutePath The absulte path of the file being edited.
     */
    open(wind: Window, text: string, absolutePath: string): void;
}