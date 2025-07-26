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

const Button: React.FC<ButtonProps> = ({ className, onClick, severity, variant, size, icon, label, loading, disabled }) => {
    return (
        <button
            className={`${className} button button-${severity || 'secondary'} button-${variant || 'solid'} button-${size || 'medium'} ${loading ? 'loading' : ''}`}
            onClick={onClick}
            disabled={disabled || loading}
            aria-label={label}
        >
            {icon && <i className={`bi bi-${icon}`}></i>}
            {label}
        </button>
    );
}

export default Button;