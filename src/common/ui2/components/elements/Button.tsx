import React from "react";
import "./button.css";

interface ButtonProps {
    onClick: () => void;
    className?: string;
    severity?: "primary" | "secondary" | "bg-base" | "danger";
    variant?: "solid" | "outline" | "ghost";
    size?: "small" | "medium" | "large";
    icon?: string;
    label?: string | JSX.Element;
    loading?: boolean;
    disabled?: boolean;
    buttonRef?: React.Ref<HTMLButtonElement>;
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
}) => {
    return (
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
            {label}
        </button>
    );
};

export default Button;
