import * as React from "react";
import Button from "@common/ui/components/elements/Button";
import PopupMenu from "@common/ui/components/elements/PopupMenu";
import { useContextMenu } from "@common/ui/store/contextMenu";
import { useState } from "react";
import { createPortal } from "react-dom";

interface Props {
    label: React.ReactNode | null;
    populator?: {
        getEntries: () => { name: string; handler: () => void }[];
    };
    children: React.ReactNode;
}

const NbtTagContainer: React.FC<Props> = (props) => {
    const [contextMenuOpen, setContextMenuOpen] = useContextMenu();
    const [menuPosition, setMenuPosition] = useState<{
        x: number;
        y: number;
    } | null>(null);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuOpen(false);
        if (props.populator) {
            setContextMenuOpen(true);
            setMenuPosition({ x: e.clientX, y: e.clientY });
        }
    };

    return (
        <div
            className={"tag-container"}
            onClick={handleClick}
            onContextMenu={handleClick}
        >
            {props.label != null && <span>{props.label}: </span>}
            {props.children}
            {contextMenuOpen &&
                createPortal(
                    <PopupMenu
                        open={contextMenuOpen}
                        x={menuPosition?.x}
                        y={menuPosition?.y}
                        onClose={() => {
                            setContextMenuOpen(false);
                            setMenuPosition(null);
                        }}
                    >
                        <div className="d-flex flex-column">
                            {props.populator?.getEntries().map((action) => (
                                <Button
                                    key={action.name}
                                    variant="ghost"
                                    size="large"
                                    label={action.name}
                                    onClick={() => {
                                        action.handler();
                                        setContextMenuOpen(false);
                                        setMenuPosition(null);
                                    }}
                                />
                            ))}
                        </div>
                    </PopupMenu>,
                    document.body,
                )}
        </div>
    );
};

export default NbtTagContainer;
