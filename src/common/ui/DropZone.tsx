import * as React from "react";

type NumberLike = number | string;
interface DropZoneProps {
    x: NumberLike;
    y: NumberLike;
    width: NumberLike;
    height: NumberLike;
    onDrop: (e: DragEvent) => void;
};

/**
 * A drag and drop drop zone where files can be dropped. This component should be
 * created when the user is dragging files over the desired area.
 */
export default class DropZone extends React.Component<DropZoneProps, {}> {
    private readonly ref: React.RefObject<HTMLDivElement> = React.createRef();

    constructor(props) {
        super(props);

        this.onDragOver = this.onDragOver.bind(this);
    }

    render() {
        return (
            <div className="drop-zone" ref={this.ref} onDragOver={this.onDragOver} style={{
                left: this.props.x + "px",
                top: this.props.y + "px",
                width: this.props.width + "px",
                height: this.props.height + "px"
            }}></div>
        );
    }

    componentDidMount() {
        // We have to listen for the drop event manually on the element as it doesn't
        // seem to work when it is assigned indirectly by react. The browser requires
        // a direct ondrop listener for an element to be considered a valid drag and
        // drop target.
        this.ref.current.ondrop = this.onDrop.bind(this);
    }

    onDragOver(e: React.DragEvent) {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    }

    onDrop(e: DragEvent) {
        e.preventDefault();

        this.props.onDrop(e);
    }
}