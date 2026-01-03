import React, { useRef, useState } from "react";
import "./button.css";
import PopupMenu from "./PopupMenu";

interface ButtonProps {
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    className?: string;
    severity?: "primary" | "secondary" | "danger" | "bg-base" | "white";
    variant?: "solid" | "outline" | "ghost";
    size?: "small" | "medium" | "large";
    icon?: string;
    label?: string | JSX.Element;
    loading?: boolean;
    disabled?: boolean;
    buttonRef?: React.Ref<HTMLButtonElement>;
    alternatives?: AlternativeOption[];
}

interface AlternativeOption {
    label: string;
    onClick: () => void;
}

const Button: React.FC<ButtonProps> = ({
    className,
    onClick,
    severity = "secondary",
    variant = "solid",
    size = "medium",
    icon,
    label,
    loading,
    disabled,
    buttonRef,
    alternatives,
}) => {
    const chevronRef = useRef<HTMLButtonElement>(null);
    const [alternativesOpen, setAlternativesOpen] = useState(false);

    const btn = (
        <button
            ref={buttonRef}
            className={`${className} button button-${severity} button-${variant} button-${size} ${loading ? "loading" : ""}`}
            onClick={onClick}
            disabled={disabled || loading}
        >
            {icon && !loading && <i className={`bi bi-${icon}`}></i>}
            {loading && (
                <div>
                    <div
                        className="spinner-border spinner-border-sm"
                        role="status"
                    >
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            )}
            <span>{label}</span>
        </button>
    );

    if (alternatives && alternatives.length > 0) {
        return (
            <div className="button-with-alternatives d-flex">
                {btn}
                <Button
                    buttonRef={chevronRef}
                    icon="chevron-down"
                    onClick={() => setAlternativesOpen(!alternativesOpen)}
                    variant={variant}
                />
                <PopupMenu
                    anchorRef={chevronRef}
                    open={alternativesOpen}
                    onClose={() => setAlternativesOpen(false)}
                >
                    <div className="d-flex flex-column">
                        {alternatives.map((alt) => (
                            <Button
                                key={alt.label}
                                label={alt.label}
                                variant="ghost"
                                size="large"
                                onClick={() => {
                                    alt.onClick();
                                    setAlternativesOpen(false);
                                }}
                            />
                        ))}
                    </div>
                </PopupMenu>
            </div>
        );
    }

    return btn;
};

export default Button;
