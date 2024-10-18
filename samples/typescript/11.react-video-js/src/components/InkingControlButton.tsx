import { Image, Button } from "@fluentui/react-components";
import { InkingTool } from "@microsoft/live-share-canvas";
import React, { ReactNode } from "react";
import { FC } from "react";

export const InkingControlButton: FC<{
    tool: InkingTool;
    selectedTool: InkingTool;
    isEnabled: boolean;
    onSelectTool: (tool: InkingTool) => void;
    children: ReactNode;
}> = ({ tool, selectedTool, isEnabled, onSelectTool, children }) => (
    // TODO: change back to button
    <div
        role={"button"}
        style={{
            borderBottom:
                selectedTool === tool && isEnabled
                    ? "2px solid red"
                    : "2px solid transparent",
            width: "32px",
            minWidth: "32px",
        }}
        onClick={() => {
            onSelectTool(tool);
        }}
    >
        {children}
    </div>
);
