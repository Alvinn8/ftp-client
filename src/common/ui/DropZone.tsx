import * as React from "react";
import { useRef, useEffect } from "react";
import { useSelection } from "../ui2/store/selectionStore";

type NumberLike = number | string;
interface DropZoneProps {
    x: NumberLike;
    y: NumberLike;
    width: NumberLike;
    height: NumberLike;
    onDrop: (e: DragEvent) => void;
    onDragLeave?: (e: React.DragEvent) => void;
}

/**
 * A drag and drop drop zone where files can be dropped. This component should be
 * created when the user is dragging files over the desired area.
 */
const DropZone: React.FC<DropZoneProps> = ({
    x,
    y,
    width,
    height,
    onDrop,
    onDragLeave,
}) => {
    const ref = useRef<HTMLDivElement>(null);

    const onDragOver = (e: React.DragEvent) => {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };

    const handleOnDrop = (e: DragEvent) => {
        e.preventDefault();
        onDrop(e);
    };

    useEffect(() => {
        // We have to listen for the drop event manually on the element as it doesn't
        // seem to work when it is assigned indirectly by react. The browser requires
        // a direct ondrop listener for an element to be considered a valid drag and
        // drop target.
        if (ref.current) {
            ref.current.ondrop = handleOnDrop;
        }
    }, [onDrop]);

    return (
        <div
            className="drop-zone"
            ref={ref}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            style={{
                left: x + "px",
                top: y + "px",
                width: width + "px",
                height: height + "px",
            }}
        ></div>
    );
};

export default DropZone;

export function useDragAndDrop(
    ref: React.RefObject<HTMLDivElement>,
    onDrop: (e: DragEvent) => void,
) {
    const [dragAndDrop, setDragAndDrop] = React.useState(false);

    function onDragEnter(e: DragEvent) {
        e.preventDefault();
        setDragAndDrop(true);
        useSelection.getState().clear();
    }

    function onDragLeave(e: DragEvent) {
        if (!ref.current) {
            return;
        }
        const box = ref.current.getBoundingClientRect();
        const scrollTop = ref.current.parentElement.scrollTop;
        if (
            e.clientX > box.right ||
            e.clientX < box.x ||
            e.clientY > box.bottom + scrollTop ||
            e.clientY < box.y + scrollTop
        ) {
            console.log(3);
            setDragAndDrop(false);
        }
    }

    useEffect(() => {
        if (!ref.current) return;
        const noop = () => {};
        const onScroll = () => setDragAndDrop(false);
        ref.current.addEventListener("dragenter", onDragEnter);
        ref.current.addEventListener("dragleave", onDragLeave);
        ref.current.addEventListener("drop", noop);
        // noop event listener, we just need to listen for ondrop
        // to make the element a valid drag and drop target. The
        // real drop event will be handled by the DropZone component.
        window.addEventListener("scroll", onScroll);
        return () => {
            window.removeEventListener("scroll", onScroll);
            if (!ref.current) return;
            ref.current.removeEventListener("dragenter", onDragEnter);
            ref.current.removeEventListener("dragleave", onDragLeave);
            ref.current.removeEventListener("drop", noop);
        };
    }, [ref.current]);

    let dropZoneElement = null;
    if (dragAndDrop && ref.current && ref.current.parentElement) {
        const box = ref.current.getBoundingClientRect();
        const scrollTop = ref.current.parentElement.scrollTop;
        dropZoneElement = (
            <DropZone
                x={box.x}
                y={box.y + scrollTop}
                width={box.width}
                height={box.height}
                onDrop={(e) => {
                    setDragAndDrop(false);
                    onDrop(e);
                }}
                onDragLeave={() => setDragAndDrop(false)}
            />
        );
    }

    return dropZoneElement;
}
