import React, { useEffect, useRef, useState } from 'react';

interface StableHeightContainerProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * A container that remembers the largest height it has had and keeps that as the minimum height.
 * This prevents rapid height changes that make it difficult to click elements below the container.
 */
const StableHeightContainer: React.FC<StableHeightContainerProps> = ({ children, className, style }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [minHeight, setMinHeight] = useState<number>(0);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                setMinHeight(prevMinHeight => Math.max(prevMinHeight, height));
            }
        });

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                ...style,
                minHeight: minHeight > 0 ? `${minHeight}px` : undefined
            }}
        >
            {children}
        </div>
    );
};

export default StableHeightContainer;
