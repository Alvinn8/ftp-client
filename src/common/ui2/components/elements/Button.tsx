import React from "react";
import "./button.css";

interface ButtonProps {
    onClick: () => void;
    className?: string;
    severity?: "primary" | "secondary" | "danger";
    variant?: "solid" | "outline" | "ghost";
    size?: "small" | "medium" | "large";
    icon?: string;
    label?: string;
    loading?: boolean;
    disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    className,
    onClick,
    severity,
    variant,
    size,
    icon,
    label,
    loading,
    disabled,
}) => {
    return (
        <button
            className={`${className} button button-${severity || "secondary"} button-${variant || "solid"} button-${size || "medium"} ${loading ? "loading" : ""}`}
            onClick={onClick}
            disabled={disabled || loading}
            aria-label={label}
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
