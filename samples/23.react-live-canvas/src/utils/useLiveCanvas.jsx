/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { InkingManager, InkingTool } from "@microsoft/live-share-canvas";
import { useCallback, useEffect, useState } from "react";

export const useLiveCanvas = (liveCanvas, hostingElement) => {
  const [inkingManager, setInkingManager] = useState(undefined);
  const [error, setError] = useState(undefined);

  const setToPen = useCallback(() => {
    inkingManager.tool = InkingTool.pen
  }, [inkingManager])

  const setToLaserPointer = useCallback(() => {
    inkingManager.tool = InkingTool.laserPointer
  }, [inkingManager])

  const setToHighlighter = useCallback(() => {
    inkingManager.tool = InkingTool.highlighter
  }, [inkingManager])

  const setToEraser = useCallback(() => {
    inkingManager.tool = InkingTool.pointEraser
  }, [inkingManager])  

  const setToBlackBrush = useCallback(() => {
    inkingManager.penBrush.color = { r: 0, g: 0, b: 0 }
  }, [inkingManager])

  const setToYellowBrush = useCallback(() => {
    inkingManager.penBrush.color = { r: 255, g: 252, b: 0 }
  }, [inkingManager])

  const setToBlueBrush = useCallback(() => {
    inkingManager.penBrush.color = { r: 0, g: 0, b: 255, a: 1 }
  }, [inkingManager]) 

  const setToGreenBrush = useCallback(() => {
    inkingManager.penBrush.color = { r: 0, g: 255, b: 0 }
  }, [inkingManager])

  const setToRedBrush = useCallback(() => {
    inkingManager.penBrush.color = { r: 255, g: 0, b: 0 }
  }, [inkingManager])
  
  const clearCanvas = useCallback(() => {
    inkingManager.clear();
  }, [inkingManager])

  const startInkingManager = useCallback(async () => {
    if (!liveCanvas || !hostingElement) {
        return;
    }

    try {
      const inkingHost = hostingElement;
      const inkManager = new InkingManager(inkingHost);
      await liveCanvas.initialize(inkManager);

      // Activate the InkingManager so it starts handling pointer input
      inkManager.activate();
      setInkingManager(inkManager);
    } catch (error) {
        console.error(error);
        setError(error);
    }
  }, [liveCanvas, hostingElement]);

  useEffect(() => {
    startInkingManager();
  }, [startInkingManager]);

  return {
    canvasReady: !!inkingManager,
    inkingManager,
    setToPen,
    setToLaserPointer,
    setToHighlighter,
    setToBlackBrush,
    setToBlueBrush,
    setToYellowBrush,
    setToGreenBrush,
    setToRedBrush,
    setToEraser,
    clearCanvas,
    error,    
  }
}
