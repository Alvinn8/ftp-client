import { Modal } from "bootstrap";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NbtByte, NbtCompound } from "../../../nbt/nbtTags";

const EXPERIMENTS = [
    { name: "Beta APIs", key: "gametest" },
    { name: "Villager Trade Rebalancing", key: "villager_trades_rebalance" },
    { name: "Holiday Creator Features", key: "data_driven_items" },
    { name: "Custom biomes", key: "data_driven_biomes" },
    { name: "Upcoming Creator Features", key: "upcoming_creator_features" },
    { name: "Vibrant Visuals", key: "experimental_graphics" },
    { name: "2025 drop 2", key: "y_2025_drop_2" },
];

type BedrockExperimentsProps = {
    experimentsNbt: NbtCompound;
    onChange?: () => void;
    onClose?: () => void;
};

const BedrockExperiments: React.FC<BedrockExperimentsProps> = ({ experimentsNbt, onChange, onClose }) => {
    const modalRef: React.RefObject<HTMLDivElement> = React.createRef();
    const [, setRenderCount] = useState(0);

    const forceUpdate = () => {
        setRenderCount(count => count + 1);
    };

    useEffect(() => {
        const modalElement = modalRef.current;
        if (modalElement) {
            const modal = new Modal(modalElement, {
                backdrop: true,
                keyboard: true
            });
            modal.show();
            const handleClose = () => {
                onClose?.();
            };
            modalElement.addEventListener("hidden.bs.modal", handleClose);
            return () => {
                modal.hide();
                modalElement.removeEventListener("hidden.bs.modal", handleClose);
            };
        }
    }, []);

    const isExperimentEnabled = (key: string): boolean => {
        const tag = experimentsNbt.get(key);
        if (!tag || !(tag instanceof NbtByte)) {
            return false;
        }
        return tag.value === 1;
    };

    const getOrCreateByteTag = (key: string): NbtByte => {
        let tag = experimentsNbt.get(key);
        if (!tag) {
            tag = new NbtByte();
            experimentsNbt.add(key, tag);
        }
        if (!(tag instanceof NbtByte)) {
            // Remove the old tag if it's not a byte tag
            experimentsNbt.remove(key);
            tag = new NbtByte();
            experimentsNbt.add(key, tag);
        }  
        return tag as NbtByte;
    };


    const setExperimentsUsed = () => {
        getOrCreateByteTag("experiments_ever_used").value = 1;
        getOrCreateByteTag("saved_with_toggled_experiments").value = 1;
    };

    const setExperimentEnabled = (key: string, enabled: boolean) => {
        if (enabled) {
            setExperimentsUsed();
        }
        getOrCreateByteTag(key).value = enabled ? 1 : 0;
        forceUpdate();
        onChange?.();
    }

    return (
        createPortal(
            <div className="modal" tabIndex={-1} ref={modalRef}>
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Bedrock Edition Experiments</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <ul>
                                {EXPERIMENTS.map(exp => (
                                    <li key={exp.key} className="form-check form-switch my-3 fs-5 d-flex align-items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="form-check-input" id={exp.key}
                                            checked={isExperimentEnabled(exp.key)}
                                            onChange={(e) => setExperimentEnabled(exp.key, e.target.checked)}
                                        />
                                        <label className="form-check-label" htmlFor={exp.key}>
                                            <div>
                                                {exp.name}
                                                <pre className="d-block m-0 fs-6 text-secondary fst-italic">{exp.key}</pre>
                                            </div>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        )
    );
}
export default BedrockExperiments;
