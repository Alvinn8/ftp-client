import React, { useCallback, useEffect, useRef, useState } from "react";
import Button from "./Button";
import PopupMenu from "./PopupMenu";

export type OverflowAction = {
    icon: string;
    label: string;
    onClick: () => void;
    key?: string;
};

type OverflowToMenuProps = {
    actions: OverflowAction[];
    dividerIndex?: number | null;
    height?: number;
    className?: string;
};

const OverflowToMenu: React.FC<OverflowToMenuProps> = ({
    actions,
    dividerIndex = null,
    height = 40,
    className = "",
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const moreButtonRef = useRef<HTMLButtonElement>(null);
    const actionRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [moreActionsVisible, setMoreActionsVisible] = useState(false);
    const [hiddenActions, setHiddenActions] = useState<OverflowAction[]>([]);
    const [menuOpen, setMenuOpen] = useState(false);

    const checkMoreActionsVisibility = useCallback(() => {
        if (!containerRef.current) return;
        const { scrollHeight, clientHeight } = containerRef.current;
        setMoreActionsVisible(scrollHeight > clientHeight);
        setHiddenActions(determineHiddenActions());
    }, []);

    const determineHiddenActions = useCallback(() => {
        if (!containerRef.current) return [];
        const containerRect = containerRef.current.getBoundingClientRect();
        const hidden: OverflowAction[] = [];

        actions.forEach((action, index) => {
            const buttonEl = actionRefs.current[index];
            if (!buttonEl) return;
            const buttonRect = buttonEl.getBoundingClientRect();
            if (buttonRect.bottom > containerRect.bottom) {
                hidden.push(action);
            }
        });

        return hidden;
    }, [actions]);

    useEffect(() => {
        window.addEventListener("resize", checkMoreActionsVisibility);
        return () => {
            window.removeEventListener("resize", checkMoreActionsVisibility);
        };
    }, [checkMoreActionsVisibility]);

    useEffect(() => {
        checkMoreActionsVisibility();
    }, [actions, checkMoreActionsVisibility]);

    useEffect(() => {
        if (!moreActionsVisible) {
            setHiddenActions([]);
            setMenuOpen(false);
            return;
        }
        setHiddenActions(determineHiddenActions());
    }, [moreActionsVisible, determineHiddenActions]);

    useEffect(() => {
        if (hiddenActions.length === 0) {
            setMenuOpen(false);
        }
    }, [hiddenActions.length]);

    function handleMoreButtonClick() {
        if (hiddenActions.length === 0) return;
        setMenuOpen((prev) => !prev);
    }

    return (
        <div className={`d-flex ${className}`}>
            <div
                ref={containerRef}
                className="d-flex flex-row flex-wrap gap-2 text-nowrap overflow-hidden"
                style={{ height: `${height}px` }}
            >
                {actions.map((action, index) => (
                    <React.Fragment key={action.key ?? action.label}>
                        {dividerIndex !== null && index === dividerIndex && (
                            <div className="vr" />
                        )}
                        <Button
                            buttonRef={(el) => {
                                actionRefs.current[index] = el;
                            }}
                            icon={action.icon}
                            variant="ghost"
                            size="large"
                            label={action.label}
                            onClick={action.onClick}
                        />
                    </React.Fragment>
                ))}
            </div>
            <Button
                buttonRef={moreButtonRef}
                icon="three-dots"
                variant="ghost"
                size="large"
                label="More"
                className={`ms-auto ${moreActionsVisible ? "visible" : "invisible"}`}
                onClick={handleMoreButtonClick}
            />
            <PopupMenu
                anchorRef={moreButtonRef}
                open={menuOpen && hiddenActions.length > 0}
                onClose={() => setMenuOpen(false)}
            >
                <div className="d-flex flex-column">
                    {hiddenActions.map((action) => (
                        <Button
                            key={action.key ?? action.label}
                            icon={action.icon}
                            variant="ghost"
                            size="large"
                            label={action.label}
                            onClick={() => {
                                action.onClick();
                                setMenuOpen(false);
                            }}
                        />
                    ))}
                </div>
            </PopupMenu>
        </div>
    );
};

export default OverflowToMenu;
