import { useEffect } from "react";
import { useEventListener } from "../utils/useEventListener";

const REFERENCE_HEIGHT = 1080;

export const InkCanvas = ({
    isEnabled,
    inkingManager,
    canvasRef,
    videoSize,
}) => {
    const onMouseEvent = (event) => {
        if (isEnabled) {
            event.preventDefault();
        }
    };

    useEffect(() => {
        if (videoSize) {
            canvasRef.current.width = videoSize.width;
            canvasRef.current.height = videoSize.height;
            if (inkingManager) {
                // Update the scale of inkingManager so that the annotations appear
                // in the same positions for all users
                const scale = videoSize.height / REFERENCE_HEIGHT;
                inkingManager.scale = scale;
            }
        }
    }, [videoSize, inkingManager]);

    useEventListener("mousedown", onMouseEvent, canvasRef.current);
    useEventListener("mouseup", onMouseEvent, canvasRef.current);
    useEventListener("mousemove", onMouseEvent, canvasRef.current);

    return (
        <>
            <div
                className="noselect"
                ref={canvasRef}
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
