import React, { useId } from "react";
import "./checkbox.css";

interface CheckboxProps {
    className?: string;
    checked: boolean;
    severity?: "primary" | "white";
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({
    className,
    checked,
    severity = "primary",
    onChange,
    disabled = false,
}) => {
    const id = useId();
    return (
        <label
            className={`checkbox-wrapper ${checked ? "checkbox-wrapper-checked" : ""} checkbox-wrapper-${severity} ${disabled ? "checkbox-wrapper-disabled" : ""} ${className}`}
            htmlFor={id}
        >
            <input
                id={id}
                type="checkbox"
                className="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
            />
            {checked && <i className="bi bi-check checkbox-check" />}
        </label>
    );
};

export default Checkbox;
