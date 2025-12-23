import { EventEmitter } from "eventemitter3";
import { useState, useEffect } from "react";

const emitter = new EventEmitter();

export function useContextMenu() {
    const [localOpen, setLocalOpen] = useState(false);

    function set(open: boolean) {
        // Close all other context menus
        emitter.emit("open");
        // Open this one
        setLocalOpen(open);
    }

    useEffect(() => {
        function handleOpen() {
            setLocalOpen(false);
        }
        emitter.on("open", handleOpen);
        return () => {
            emitter.off("open", handleOpen);
        };
    });

    return [localOpen, set] as const;
}
