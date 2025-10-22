import React from "react";
import "./plusMinusInput.css";
import Button from "./Button";

type PlusMinusInputProps = {
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
}

const PlusMinusInput = ({ value, onChange, min, max }: PlusMinusInputProps) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseInt(e.target.value, 10);
        if (!isNaN(newValue) && newValue >= min && newValue <= max) {
            onChange(newValue);
        }
    };

    return (
        <div className="plus-minus-input">
            <Button
                onClick={() => onChange(Math.max(value - 1, min))}
                icon="dash"
                variant="ghost"
            />
            <input type="number" value={value} onChange={handleChange} min={min} max={max} />
            <Button
                onClick={() => onChange(Math.min(value + 1, max))}
                icon="plus"
                variant="ghost"
            />
        </div>
    );
}

export default PlusMinusInput;
