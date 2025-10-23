import React, { useId } from "react";
import "./checkbox.css";

interface CheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange }) => {
    const id = useId();
    return (
        <label className="checkbox-wrapper" htmlFor={id}>
            <input
                id={id}
                type="checkbox"
                className="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            {checked && <i className="bi bi-check checkbox-check" />}
        </label>
    );
};

export default Checkbox;
