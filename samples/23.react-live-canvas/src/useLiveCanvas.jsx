import { InkingManager } from "@microsoft/live-share-canvas";
import { useCallback, useEffect, useState } from "react";

export const useLiveCanvas = (fluidContainer, hostingElement) => {
  const [inkingManager, setInkingManager] = useState(undefined);

  const handleBlackPenClick = useCallback(() => {
    inkingManager.penBrush.color = { r: 0, g: 0, b: 0 }
  }, [inkingManager])

  const handleBluePenClick = useCallback(() => {
    inkingManager.penBrush.color = { r: 0, g: 0, b: 255, a: 1 }
  }, [inkingManager])
  
  const handleClearClick = useCallback(() => {
    inkingManager.clear();
  }, [inkingManager])

  const startInkingManager = useCallback(async () => {
    if (!fluidContainer || !hostingElement) {
        return;
    }
    const inkingHost = hostingElement;
    const inkManager = new InkingManager(inkingHost);
    const liveCanvas = fluidContainer.initialObjects.liveCanvas;
    await liveCanvas.initialize(inkManager);

    // Activate the InkingManager so it starts handling pointer input
    inkManager.activate();
    setInkingManager(inkManager);
  }, [fluidContainer, hostingElement]);

  useEffect(() => {
    startInkingManager();
  }, [startInkingManager]);

  return {
    inkingManager,
    handleBlackPenClick,
    handleBluePenClick,
    handleClearClick
  }
}
