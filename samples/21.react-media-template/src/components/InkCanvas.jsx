import React, { useRef, useEffect, useCallback, useState } from "react";
import { debounce } from "lodash";
import useResizeObserver from "use-resize-observer";
import { getInkCanvasStyles } from "../styles/styles";
import { useEventListener } from "../utils/useEventListener";
import { useVisibleVideoSize } from "../utils/useVisibleVideoSize";

let ctx;
let lastX;
let lastY;

const drawCircle = (x = 50, y = 100) => {
  ctx.beginPath();
  ctx.strokeStyle = "red";
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.closePath();
  [lastX, lastY] = [x, y];
};

const getCursorPosition = (event, canvas) => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
};

export const InkCanvas = ({ isEnabled, strokes, sendStrokes }) => {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const strokesToSend = useRef([]);
  const { ref: resizeRef, width = 1, height = 1 } = useResizeObserver();
  const videoSize = useVisibleVideoSize(width, height);

  const clearCanvas = useCallback(() => {
    console.log("clearing canvas");
    [lastX, lastY] = [undefined, undefined];
    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, [canvasRef]);

  // eslint-disable-next-line
  const debouncedClearCanvas = useCallback(debounce(clearCanvas, 1000), [
    clearCanvas,
  ]);

  const sendLatestStrokes = useCallback(() => {
    if (strokesToSend.current.length > 0) {
      sendStrokes(strokesToSend.current);
      strokesToSend.current = [];
    }
  }, [strokesToSend, sendStrokes]);

  // eslint-disable-next-line
  const debouncedSendLatestStrokes = useCallback(
    debounce(sendLatestStrokes, 50),
    [sendLatestStrokes]
  );

  // Show a stroke at coordinate
  const renderStroke = useCallback(
    (stroke) => {
      if (!ctx) {
        ctx = canvasRef.current.getContext("2d");
      }
      drawCircle(stroke.x, stroke.y);
    },
    [canvasRef]
  );

  

  const onMouseDraw = (e) => {
    const cursorPosition = getCursorPosition(e, canvasRef.current);
    const stroke = {
      x: cursorPosition.x / videoSize.width,
      y: cursorPosition.y / videoSize.height,
    };

    const strokes = [...strokesToSend.current, stroke];
    strokesToSend.current = strokes;
    debouncedSendLatestStrokes();
    renderStroke(cursorPosition);
    debouncedClearCanvas();
  }

  // Callback for a click handled on the canvas
  const onMouseDown = (event) => {
    if (isEnabled) {
      event.preventDefault();
    }
    setDrawing(true);
    onMouseDraw(event);
  };

  // Callback for a click handled on the canvas
  const onMouseUp = useCallback(
    (event) => {
      if (isEnabled) {
        event.preventDefault();
      }
      [lastX, lastY] = [undefined, undefined];
      setDrawing(false);
      sendLatestStrokes();
    },
    [isEnabled, sendLatestStrokes]
  );

  const onMouseMove = (e) => {
    if (isEnabled) {
      e.preventDefault();
    }
    if (drawing) {
      onMouseDraw(e);
    }
  };

  const handleIncomingEvent = useCallback(
    (videoCanvasEvent) => {
      if (videoSize) {
        renderStroke({
          x: Math.round(videoCanvasEvent.x * videoSize.width),
          y: Math.round(videoCanvasEvent.y * videoSize.height),
        });
      }
    },
    [videoSize, renderStroke]
  );

  useEffect(() => {
    if (strokes) {
      console.log("new remote strokes received");
      strokes.forEach((stroke) => {
        handleIncomingEvent(stroke);
      });
      [lastX, lastY] = [undefined, undefined];
      
      debouncedClearCanvas();
    }
  }, [strokes, debouncedClearCanvas, handleIncomingEvent]);

  useEffect(() => {
    if (videoSize) {
      canvasRef.current.width = videoSize.width;
      canvasRef.current.height = videoSize.height;
    }
  }, [videoSize]);

  useEventListener("mousedown", onMouseDown, canvasRef.current);
  useEventListener("mouseup", onMouseUp, canvasRef.current);
  useEventListener("mousemove", onMouseMove, canvasRef.current);

  const inkStyles = getInkCanvasStyles();

  return (
    <>
      <div className={inkStyles.root} ref={resizeRef} />
      <canvas
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
          zIndex: 1,
          pointerEvents: isEnabled ? "auto" : "none",
        }}
      />
    </>
  );
};
