import React from "react";
import { usePath } from "../../store/pathStore";
import Button from "../elements/Button";

const Path: React.FC = () => {
    const path = usePath((state) => state.path);
    const setPath = usePath((state) => state.setPath);
    const parts = path.split("/").filter((part) => part.length > 0);

    function onClickPart(index: number) {
        return () => {
            const newPath = "/" + parts.slice(0, index + 1).join("/");
            setPath(newPath);
        };
    }

    return (
        <div className="overflow-x-auto text-nowrap bg-dark-ui2">
            <Button icon="house" variant="ghost" onClick={() => setPath("/")} />
            {parts.map((part, index) => (
                <React.Fragment key={index}>
                    <i className="bi bi-chevron-right" />
                    <Button
                        label={part}
                        variant="ghost"
                        onClick={onClickPart(index)}
                    />
                </React.Fragment>
            ))}
        </div>
    );
};

export default Path;
