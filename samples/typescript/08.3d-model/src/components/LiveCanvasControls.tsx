import { useEffect, FC, useState, ReactNode } from "react";
import {
    InkingTool,
    fromCssColor,
    InkingManager,
} from "@microsoft/live-share-canvas";
import { Cursor24Filled, Delete24Filled } from "@fluentui/react-icons";
import { Button, Image, tokens } from "@fluentui/react-components";
import { FlexRow } from "./flex";

interface InkingControlsProps {
    inkingManager: InkingManager;
    setIsEnabled: (enabled: boolean) => void;
    isEnabled: boolean;
}

export const LiveCanvasControls: FC<InkingControlsProps> = ({
    inkingManager,
    setIsEnabled,
    isEnabled,
}) => {
    const [selectedTool, setSelectedTool] = useState<InkingTool>(
        inkingManager.tool
    );
    const resetToDefaultTool = () => {
        // Laser pointer replaces the cursor behavior on hovering, so we reset to another tool.
        // Clicks are disabled when isEnabled is false, so this isn't a big deal.
        inkingManager.tool = InkingTool.pen;
    };
    const onSelectTool = (tool: InkingTool) => {
        inkingManager.tool = tool;
        if (tool !== selectedTool) {
            setSelectedTool(tool);
        }
        if (isEnabled && tool === selectedTool) {
            setIsEnabled(false);
            resetToDefaultTool();
        } else {
            setIsEnabled(true);
        }
    };

    useEffect(() => {
        if (inkingManager) {
            // Change default color of pen brush
            inkingManager.penBrush.color = fromCssColor("#E3182D");
        }
    }, [inkingManager]);

    return (
        <FlexRow
            gap="smaller"
            style={{ marginLeft: "8px", marginRight: "4px" }}
            vAlign="center"
        >
            <LiveCanvasButton
                selected={isEnabled === false}
                onClick={() => {
                    if (!isEnabled) return;
                    setIsEnabled(false);
                    resetToDefaultTool();
                }}
            >
                <Cursor24Filled />
            </LiveCanvasButton>
            <InkingToolButton
                imageSrc={"/laser-pointer.svg"}
                tool={InkingTool.laserPointer}
                isEnabled={isEnabled}
                selectedTool={selectedTool}
                onSelectTool={onSelectTool}
            />
            <InkingToolButton
                imageSrc={"/pen.svg"}
                tool={InkingTool.pen}
                isEnabled={isEnabled}
                selectedTool={selectedTool}
                onSelectTool={onSelectTool}
            />
            <InkingToolButton
                imageSrc={"/highlighter.svg"}
                tool={InkingTool.highlighter}
                isEnabled={isEnabled}
                selectedTool={selectedTool}
                onSelectTool={onSelectTool}
            />
            <InkingToolButton
                imageSrc={"/eraser.svg"}
                isEnabled={isEnabled}
                onSelectTool={onSelectTool}
                selectedTool={selectedTool}
                tool={InkingTool.eraser}
            />
            <LiveCanvasButton
                onClick={() => {
                    inkingManager?.clear();
                }}
            >
                <Delete24Filled />
            </LiveCanvasButton>
        </FlexRow>
    );
};

/**
 * Inking button control component
 */
const InkingToolButton: FC<{
    imageSrc: string;
    isEnabled: boolean;
    onSelectTool: (tool: InkingTool) => void;
    selectedTool: InkingTool;
    tool: InkingTool;
}> = ({ imageSrc, isEnabled, onSelectTool, selectedTool, tool }) => (
    <LiveCanvasButton
        selected={selectedTool === tool && isEnabled}
        onClick={() => {
            onSelectTool(tool);
        }}
    >
        <Image src={imageSrc} width={24} height={24} />
    </LiveCanvasButton>
);

/**
 * LiveCanvas base control button
 */
const LiveCanvasButton: FC<{
    onClick: () => void;
    children: ReactNode;
    selected?: boolean;
}> = ({ onClick, children, selected }) => (
    <Button
        appearance="subtle"
        size="small"
        style={{
            borderBottom: selected ? "2px solid red" : "2px solid transparent",
            maxWidth: "32px",
            maxHeight: "32px",
            minWidth: "32px",
            minHeight: "32px",
            padding: "0px",
            color: tokens.colorNeutralForeground2,
        }}
        onClick={onClick}
    >
        {children}
    </Button>
);
