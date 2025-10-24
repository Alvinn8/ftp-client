import React from "react";
import Button from "../elements/Button";
import { useSelection } from "../../store/selectionStore";
import { usePath } from "../../store/pathStore";
import { openEditor } from "../../../ui/editor/editor";
import { unexpectedErrorHandler } from "../../../error";

const Actions: React.FC = () => {
    const selectedEntries = useSelection((state) => state.selectedEntries);
    const setPath = usePath((state) => state.setPath);

    return (
        <div className="d-flex flex-row gap-2 flex-wrap">
            <Button
                icon="file-earmark-plus"
                variant="ghost"
                size="large"
                label="New File"
                onClick={() => {}}
            />
            <Button
                icon="folder-plus"
                variant="ghost"
                size="large"
                label="New Folder"
                onClick={() => {}}
            />
            <Button
                icon="upload"
                variant="ghost"
                size="large"
                label="Upload"
                onClick={() => {}}
            />
            {selectedEntries.length > 0 && (
                <>
                    <div className="vr" />
                    {selectedEntries.length === 1 &&
                        selectedEntries[0].isDirectory() && (
                            <Button
                                icon="folder2-open"
                                variant="ghost"
                                size="large"
                                label="Open"
                                onClick={() => setPath(selectedEntries[0].path)}
                            />
                        )}
                    {selectedEntries.length === 1 &&
                        selectedEntries[0].isFile() && (
                            <Button
                                icon="box-arrow-up-right"
                                variant="ghost"
                                size="large"
                                label="Open"
                                onClick={() => {
                                    openEditor(selectedEntries[0]).catch(
                                        unexpectedErrorHandler(
                                            "Failed to open",
                                        ),
                                    );
                                }}
                            />
                        )}
                    <Button
                        icon="download"
                        variant="ghost"
                        size="large"
                        label="Download"
                        onClick={() => {}}
                    />
                    {selectedEntries.length === 1 && (
                        <Button
                            icon="pencil"
                            variant="ghost"
                            size="large"
                            label="Rename"
                            onClick={() => {}}
                        />
                    )}
                    <Button
                        icon="trash"
                        variant="ghost"
                        size="large"
                        label="Delete"
                        onClick={() => {}}
                    />
                </>
            )}
        </div>
    );
};

export default Actions;
