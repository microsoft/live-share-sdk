import React, { useRef, useEffect } from "react";
import useResizeObserver from "use-resize-observer";
import { InkingTool } from "@microsoft/live-share-canvas";
import { getInkCanvasStyles } from "../styles/styles";
import { useVisibleVideoSize } from "../utils/useVisibleVideoSize";
import { useLiveCanvas } from "../live-share-hooks";
import { useEventListener } from "../utils/useEventListener";

export const InkCanvas = ({ isEnabled, liveCanvas }) => {
  const canvasRef = useRef(null);
  // useLiveCanvas hook will insert the canvas as a child of hosting element
  // and starts the Live Inking session.It returns set of callbacks for clearing 
  // the canvas, changing Ink tool type, and brush colors.
  const { inkingManager } = useLiveCanvas(liveCanvas, canvasRef.current)
  const { ref: resizeRef, width = 1, height = 1 } = useResizeObserver();
  const videoSize = useVisibleVideoSize(width, height);

  const onMouseEvent = (event) => {
    if (isEnabled) {
      event.preventDefault();
    }
  };

  useEffect(() => {
    if (!inkingManager) {
      return;
    }

    if (isEnabled) {
      inkingManager.tool = InkingTool.highlighter;
    } else {
      inkingManager.clear();
    }    
  }, [inkingManager, isEnabled]);

  useEffect(() => {
    if (videoSize) {
      canvasRef.current.width = videoSize.width;
      canvasRef.current.height = videoSize.height;
    }
  }, [videoSize]);

  useEventListener("mousedown", onMouseEvent, canvasRef.current);
  useEventListener("mouseup", onMouseEvent, canvasRef.current);
  useEventListener("mousemove", onMouseEvent, canvasRef.current);
  const inkStyles = getInkCanvasStyles();

  return (
    <>
      <div className={inkStyles.root} ref={resizeRef} />
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
