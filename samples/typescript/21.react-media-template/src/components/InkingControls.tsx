import { useState, useCallback, useEffect, FC, SetStateAction, Dispatch } from "react";
import {
    InkingTool,
    fromCssColor,
    InkingManager,
    LiveCanvas,
} from "@microsoft/live-share-canvas";
import { Image } from "@fluentui/react-components";
import { FlexRow } from "./flex";
import { InkingControlButton } from "./InkingControlButton";
// @ts-ignore
import LaserPointerIcon from "../assets/laser-pointer.svg";
// @ts-ignore
import PenIcon from "../assets/pen.svg";
// @ts-ignore
import HighlighterIcon from "../assets/highlighter.svg";
// @ts-ignore
import EraserIcon from "../assets/eraser.svg";

interface InkingControlsProps {
    liveCanvas: LiveCanvas;
    inkingManager: InkingManager;
    setIsEnabled: Dispatch<SetStateAction<boolean>>;
    isEnabled: boolean;
}

export const InkingControls: FC<InkingControlsProps> = ({
    liveCanvas,
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
        if (!inkingManager) return;
        // Change default color of pen brush
        inkingManager.penBrush.color = fromCssColor("#E3182D");
    }, [inkingManager]);

    useEffect(() => {
        if (!liveCanvas) return;
        liveCanvas.isCursorShared = true;
    }, [liveCanvas]);

    return (
        <FlexRow gap="smaller" style={{ marginLeft: "8px", marginRight: "4px" }}>
            {/* TODO: (Corina) fix marginSpacer usage to gap="small" */}
            <InkingControlButton
                tool={InkingTool.laserPointer}
                isEnabled={isEnabled}
                selectedTool={selectedTool}
                onSelectTool={onSelectTool}
            >
                <Image src={LaserPointerIcon} />
            </InkingControlButton>
            <InkingControlButton
                tool={InkingTool.pen}
                isEnabled={isEnabled}
                selectedTool={selectedTool}
                onSelectTool={onSelectTool}
            >
                <Image src={PenIcon} />
            </InkingControlButton>
            <InkingControlButton
                tool={InkingTool.highlighter}
                isEnabled={isEnabled}
                selectedTool={selectedTool}
                onSelectTool={onSelectTool}
            >
                <Image src={HighlighterIcon} />
            </InkingControlButton>
            <InkingControlButton
                tool={InkingTool.eraser}
                isEnabled={isEnabled}
                selectedTool={selectedTool}
                onSelectTool={onSelectTool}
            >
                <Image src={EraserIcon} />
            </InkingControlButton>
        </FlexRow>
    );
};
