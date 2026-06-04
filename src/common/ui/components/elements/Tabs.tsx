import React from "react";
import "./tabs.css";

type Tab<T> = {
    id: T;
    label: string;
    icon: string;
};

interface TabsProps<T> {
    tabs: Tab<T>[];
    activeTab: T;
    onTabChange: (tab: T) => void;
}

const Tabs = <T,>({ tabs, activeTab, onTabChange }: TabsProps<T>) => {
    return (
        <div className="tabs">
            {tabs.map((tab, index) => (
                <button
                    className={`tab ${activeTab === tab.id ? "active" : ""}`}
                    onClick={() => onTabChange(tab.id)}
                    key={`${tab.id}${index}`}
                >
                    <i className={`bi bi-${tab.icon}`}></i> {tab.label}
                </button>
            ))}
        </div>
    );
};

export default Tabs;
