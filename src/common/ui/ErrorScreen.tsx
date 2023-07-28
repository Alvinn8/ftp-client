import React from "react";

interface ErrorScreenProps {
    title: string;
    body: string;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({ title, body }) => {
    return (
        <div className="screen-container">
            <div className="screen">
                <span className="screen-icon text-danger">
                    <i className="bi bi-exclamation-circle-fill"></i>
                </span>
                <h2>{ title }</h2>
                <p>{ body }</p>
            </div>
        </div>
        );
};

export default ErrorScreen;