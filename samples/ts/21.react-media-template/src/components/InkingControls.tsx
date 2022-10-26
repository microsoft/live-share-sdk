import { useState, useCallback, useEffect, FC } from "react";
import { InkingTool, fromCssColor, InkingManager } from "@microsoft/live-share-canvas";
import { FlexRow } from "./flex";
import { InkingControlButton } from "./InkingControlButton";
import React from "react";

interface InkingControlsProps {
  inkingManager: InkingManager,
  setIsEnabled: (enabled: boolean) => void,
  isEnabled: boolean
}

export const InkingControls: FC<InkingControlsProps> = ({ inkingManager, setIsEnabled, isEnabled }) => {
  const [selectedTool, setSelectedTool] = useState(inkingManager.tool);
  const onSelectTool = useCallback(
    (tool) => {
      if (tool !== selectedTool) {
        inkingManager.tool = tool;
        setSelectedTool(tool);
      }
      if (isEnabled && tool === selectedTool) {
        setIsEnabled(false);
      } else {
        setIsEnabled(true);
      }
    },
    [inkingManager, isEnabled, selectedTool, setIsEnabled]
  );

  useEffect(() => {
    if (inkingManager) {
      // Change default color of pen brush
      inkingManager.penBrush.color = fromCssColor("#E3182D");
    }
  }, [inkingManager]);

  return (
    <FlexRow marginSpacer style={{ marginLeft: "8px", marginRight: "4px" }}>
      <InkingControlButton
        tool={InkingTool.laserPointer}
        isEnabled={isEnabled}
        selectedTool={selectedTool}
        imageAsset={"../assets/laser-pointer.svg"}
        onSelectTool={onSelectTool}
      />
      <InkingControlButton
        tool={InkingTool.pen}
        isEnabled={isEnabled}
        selectedTool={selectedTool}
        imageAsset={"../assets/pen.svg"}
        onSelectTool={onSelectTool}
      />
      <InkingControlButton
        tool={InkingTool.highlighter}
        isEnabled={isEnabled}
        selectedTool={selectedTool}
        imageAsset={"../assets/highlighter.svg"}
        onSelectTool={onSelectTool}
      />
      <InkingControlButton
        tool={InkingTool.eraser}
        isEnabled={isEnabled}
        selectedTool={selectedTool}
        imageAsset={"../assets/eraser.svg"}
        onSelectTool={onSelectTool}
      />
    </FlexRow>
  );
};
