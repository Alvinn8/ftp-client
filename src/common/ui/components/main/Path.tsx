import React from "react";
import { usePath } from "@common/ui/store/pathStore";
import Button from "@common/ui/components/elements/Button";
import { useMoveDropTarget } from "@common/ui/useMoveDropTarget";

/** A breadcrumb entry that also acts as a move drop target for its path. */
const Segment: React.FC<{ destPath: string; children: React.ReactNode }> = ({
    destPath,
    children,
}) => {
    const { isDropTarget, dropProps } = useMoveDropTarget(destPath);
    return (
        <span
            className={
                "d-inline-block rounded" +
                (isDropTarget ? " bg-highlight-ui2" : "")
            }
            {...dropProps}
        >
            {children}
        </span>
    );
};

const Path: React.FC = () => {
    const path = usePath((state) => state.path);
    const setPath = usePath((state) => state.setPath);
    const parts = path.split("/").filter((part) => part.length > 0);

    return (
        <div className="overflow-x-auto text-nowrap">
            <Segment destPath="/">
                <Button
                    icon="house"
                    variant="ghost"
                    onClick={() => setPath("/")}
                />
            </Segment>
            {parts.map((part, index) => {
                const partPath = "/" + parts.slice(0, index + 1).join("/");
                return (
                    <React.Fragment key={index}>
                        <i className="bi bi-chevron-right" />
                        <Segment destPath={partPath}>
                            <Button
                                label={part}
                                variant="ghost"
                                onClick={() => setPath(partPath)}
                            />
                        </Segment>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default Path;
