import React from "react";
import Button from "../ui2/components/Button";

interface ErrorScreenProps {
    title: string;
    body: string;
    action?: {
        label: string;
        onClick: () => void;
    } | null;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({ title, body, action }) => {
    return (
        <div className="screen-container">
            <div className="screen">
                <span className="screen-icon text-danger">
                    <i className="bi bi-exclamation-circle-fill"></i>
                </span>
                <h2>{ title }</h2>
                <p>{ body }</p>
                { action && (
                    <Button severity="danger" label={action.label} onClick={action.onClick} />
                )}
            </div>
        </div>
        );
};

export default ErrorScreen;