import { useState, useCallback, useEffect, FC } from "react";
import {
    InkingTool,
    fromCssColor,
    InkingManager,
} from "@microsoft/live-share-canvas";
import { FlexRow } from "./flex";
import { InkingControlButton } from "./InkingControlButton";
import React from "react";
// @ts-ignore
import { ReactComponent as LaserPointerIcon } from "../assets/laser-pointer.svg";
// @ts-ignore
import { ReactComponent as PenIcon } from "../assets/pen.svg";
// @ts-ignore
import { ReactComponent as HighlighterIcon } from "../assets/highlighter.svg";
// @ts-ignore
import { ReactComponent as EraserIcon } from "../assets/eraser.svg";

interface InkingControlsProps {
    inkingManager: InkingManager;
    setIsEnabled: (enabled: boolean) => void;
    isEnabled: boolean;
}

export const InkingControls: FC<InkingControlsProps> = ({
    inkingManager,
    setIsEnabled,
    isEnabled,
}) => {
    const [selectedTool, setSelectedTool] = useState(inkingManager.tool);
    const onSelectTool = useCallback(
        (tool: InkingTool) => {
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
            {/* TODO: (Corina) fix marginSpacer usage to gap="small" */}
            <InkingControlButton
                tool={InkingTool.laserPointer}
                isEnabled={isEnabled}
                selectedTool={selectedTool}
                onSelectTool={onSelectTool}
            >
                <LaserPointerIcon />
            </InkingControlButton>
            <InkingControlButton
                tool={InkingTool.pen}
                isEnabled={isEnabled}
                selectedTool={selectedTool}
                onSelectTool={onSelectTool}
            >
                <PenIcon />
            </InkingControlButton>
            <InkingControlButton
                tool={InkingTool.highlighter}
                isEnabled={isEnabled}
                selectedTool={selectedTool}
                onSelectTool={onSelectTool}
            >
                <HighlighterIcon />
            </InkingControlButton>
            <InkingControlButton
                tool={InkingTool.eraser}
                isEnabled={isEnabled}
                selectedTool={selectedTool}
                onSelectTool={onSelectTool}
            >
                <EraserIcon />
            </InkingControlButton>
        </FlexRow>
    );
};
