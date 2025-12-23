import React, { useCallback, useEffect, useRef, useState } from "react";

export type PopupMenuProps = {
    anchorRef: React.RefObject<HTMLElement>;
    x?: number;
    y?: number;
    open: boolean;
    onClose: () => void;
    offset?: number;
    minWidth?: number;
    className?: string;
    children: React.ReactNode;
};

const PopupMenu: React.FC<PopupMenuProps> = ({
    anchorRef,
    x,
    y,
    open,
    onClose,
    offset = 5,
    minWidth = 200,
    className = "",
    children,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{
        left: number;
        top: number;
    } | null>(null);

    const computePosition = useCallback(() => {
        if (x !== undefined && y !== undefined) {
            setPosition({ left: x, top: y });
            return;
        }
        const anchor = anchorRef.current;
        if (!anchor) return;
        const rect = anchor.getBoundingClientRect();
        setPosition({ left: rect.left, top: rect.bottom + offset });
    }, [anchorRef, x, y, offset]);

    useEffect(() => {
        if (!open) {
            setPosition(null);
            return;
        }
        computePosition();
    }, [open, computePosition]);

    useEffect(() => {
        if (!open) return;
        const handle = () => computePosition();
        window.addEventListener("resize", handle);
        window.addEventListener("scroll", handle, true);
        return () => {
            window.removeEventListener("resize", handle);
            window.removeEventListener("scroll", handle, true);
        };
    }, [open, computePosition]);

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuRef.current && menuRef.current.contains(target)) return;
            if (anchorRef.current && anchorRef.current.contains(target)) return;
            onClose();
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open, onClose, anchorRef]);

    useEffect(() => {
        if (!open || !menuRef.current || !position) return;
        const menuRect = menuRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const maxLeft = Math.max(8, viewportWidth - menuRect.width - 8);
        const clampedLeft = Math.min(position.left, maxLeft);
        if (Math.abs(clampedLeft - position.left) > 1) {
            setPosition((prev) =>
                prev ? { ...prev, left: clampedLeft } : prev,
            );
        }
    }, [open, position]);

    if (!open || !position) return null;

    return (
        <div
            ref={menuRef}
            className={`position-fixed bg-base-ui2 rounded shadow border ${className}`}
            style={{
                left: position.left,
                top: position.top,
                minWidth: `${minWidth}px`,
            }}
        >
            {children}
        </div>
    );
};

export default PopupMenu;
