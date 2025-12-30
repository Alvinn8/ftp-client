import React, { useEffect, useState } from "react";
import IgnoreErrorBoundary from "./IgnoreErrorBoundary";

type Size = [number, number]; // width, height

interface AdProps {
    sizes: Size[];
}

const Ad: React.FC<AdProps> = ({ sizes }) => {
    // Placeholder for ad component
    const [sizesThatFit, setSizesThatFit] = useState<Size[]>([]);
    const [size, setSize] = useState<Size>([0, 0]);

    const fits = ([width, height]: Size) =>
        width < window.innerWidth && height < window.innerHeight;

    const updateSizesThatFit = () => setSizesThatFit(sizes.filter(fits));

    const chooseRandomSize = () => {
        const index = Math.floor(Math.random() * sizesThatFit.length);
        setSize(sizesThatFit[index] ?? [0, 0]);
    };

    const cycleSize = () => {
        if (sizesThatFit.length === 0) return;
        const currentIndex = sizesThatFit.indexOf(size);
        const nextIndex = (currentIndex + 1) % sizesThatFit.length;
        setSize(sizesThatFit[nextIndex]);
    };

    useEffect(() => {
        updateSizesThatFit();
        window.addEventListener("resize", updateSizesThatFit);
        return () => {
            window.removeEventListener("resize", updateSizesThatFit);
        };
    }, [sizes]);

    useEffect(() => {
        if (size[0] === 0 && size[1] === 0 && sizesThatFit.length > 0) {
            chooseRandomSize();
            return;
        }
        if (!fits(size)) {
            chooseRandomSize();
            return;
        }
    }, [sizesThatFit]);

    const [width, height] = size;
    return (
        <IgnoreErrorBoundary
            fallback={<span>Failed to load advertisement.</span>}
        >
            <div
                className="d-flex flex-column align-items-center text-center justify-content-center text-black"
                style={{
                    width: `${width}px`,
                    height: `${height}px`,
                    backgroundColor: "cyan",
                }}
                onClick={cycleSize}
            >
                <span>Example Advertisement</span>
                {sizesThatFit.length > 1 && (
                    <span className="mt-2">Click to cycle size</span>
                )}
            </div>
        </IgnoreErrorBoundary>
    );
};
export default Ad;
