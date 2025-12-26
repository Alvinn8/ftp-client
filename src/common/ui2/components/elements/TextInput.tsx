import React, { useId } from "react";
import "./textInput.css";

interface TextInputProps {
    className?: string;
    label?: string;
    value: string;
    onChange: (value: string) => void;
    type?: "text" | "password" | "email" | "number";
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
}

const TextInput: React.FC<TextInputProps> = ({
    className,
    label,
    value,
    onChange,
    type = "text",
    placeholder,
    disabled = false,
    required = false,
}) => {
    const id = useId();

    return (
        <div className={`text-input-wrapper ${className || ""}`}>
            {label && (
                <label htmlFor={id} className="text-input-label">
                    {label}
                    {required && <span className="text-input-required">*</span>}
                </label>
            )}
            <input
                id={id}
                type={type}
                className="text-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
            />
        </div>
    );
};

export default TextInput;
