import React, { FC, MutableRefObject, useEffect } from "react";
import useResizeObserver from "use-resize-observer";
import { getInkCanvasStyles } from "../styles/styles";
import { useVisibleVideoSize } from "../utils/useVisibleVideoSize";
import { useEventListener } from "../utils/useEventListener";
import { InkingManager } from "@microsoft/live-share-canvas";

const REFERENCE_HEIGHT = 1080;

export const InkCanvas: FC<{
    isEnabled: boolean;
    inkingManager: InkingManager;
    canvasRef: MutableRefObject<HTMLDivElement | undefined>;
}> = ({ isEnabled, inkingManager, canvasRef }) => {
    const { ref: resizeRef, width = 1, height = 1 } = useResizeObserver();
    const videoSize = useVisibleVideoSize(width, height);

    const onMouseEvent = (event: Event) => {
        if (isEnabled) {
            event.preventDefault();
        }
    };

    useEffect(() => {
        if (videoSize && canvasRef.current) {
            canvasRef.current.style.width = `${videoSize.width}px`;
            canvasRef.current.style.height = `${videoSize.height}px`;
            if (inkingManager) {
                // Update the scale of inkingManager so that the annotations appear
                // in the same positions for all users
                const scale = videoSize.height / REFERENCE_HEIGHT;
                inkingManager.scale = scale;
            }
        }
    }, [videoSize, inkingManager, canvasRef]);

    useEventListener("mousedown", onMouseEvent, canvasRef.current);
    useEventListener("mouseup", onMouseEvent, canvasRef.current);
    useEventListener("mousemove", onMouseEvent, canvasRef.current);
    const inkStyles = getInkCanvasStyles();

    return (
        <>
            <div className={inkStyles.root} ref={resizeRef} />
            <div
                className="noselect"
                ref={canvasRef as MutableRefObject<HTMLDivElement>}
                style={{
                    visibility: videoSize ? "visible" : "hidden",
                    position: "absolute",
                    left: `${videoSize?.xOffset || 0}px`,
                    top: `${videoSize?.yOffset || 0}px`,
                    width: `${videoSize?.width || 0}px`,
                    height: `${videoSize?.height || 0}px`,
                    backgroundColor: "transparent",
                    pointerEvents: isEnabled ? "auto" : "none",
                }}
            />
        </>
    );
};
