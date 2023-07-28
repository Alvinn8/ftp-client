import React from "react";

interface ConnectingScreenProps {
    title: string;
    body: string;
}

const ConnectingScreen: React.FC<ConnectingScreenProps> = ({ title, body }) => {
    return (
        <div className="screen-container">
            <div className="screen">
                <span className="screen-icon">
                    <div className="spinner-grow text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </span>
                <h2>{ title }</h2>
                <p>{ body }</p>
            </div>
        </div>
    );
};

export default ConnectingScreen;