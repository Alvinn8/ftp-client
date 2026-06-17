import { create } from "zustand";

/**
 * Information about an ongoing connection problem that prevents the session
 * from creating new connections to the server.
 */
interface ConnectionIssue {
    /** Whether the browser reports being offline at the time of the failure. */
    offline: boolean;
    /**
     * The error that occurred, if any. Will be displayed to the user if it is a known
     * error type.
     */
    error: Error | null;
}

interface ConnectionIssueState {
    /** The current connection issue, or null if connections are healthy. */
    issue: ConnectionIssue | null;
    /** Whether a reconnection attempt is currently in progress. */
    reconnecting: boolean;
    /** Show a connection issue overlay. */
    showIssue: (issue: ConnectionIssue) => void;
    /** Clear the connection issue overlay, e.g. when connections recover. */
    clearIssue: () => void;
    /** Set whether a reconnection attempt is in progress. */
    setReconnecting: (reconnecting: boolean) => void;
}

const useConnectionIssue = create<ConnectionIssueState>((set, get) => ({
    issue: null,
    reconnecting: false,
    // showIssue resets the reconnecting flag: a fresh failure means the
    // previous reconnection attempt (if any) did not succeed.
    showIssue: (issue) => set({ issue, reconnecting: false }),
    clearIssue: () => {
        if (get().issue !== null) {
            set({ issue: null, reconnecting: false });
        }
    },
    setReconnecting: (reconnecting) => set({ reconnecting }),
}));

export { useConnectionIssue };
export type { ConnectionIssue };
