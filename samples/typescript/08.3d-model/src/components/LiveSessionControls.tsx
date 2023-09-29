import { FC } from "react";
import { FlexRow } from "./flex";
import { tokens } from "@fluentui/react-theme";
import { LiveCanvasControls } from "./LiveCanvasControls";
import { InkingManager } from "@microsoft/live-share-canvas";

interface ILiveSessionFloatingControlsProps {
    inkingManager?: InkingManager;
    inkingActive: boolean;
    setInkingActive: (enabled: boolean) => void;
}

export const LiveSessionControls: FC<ILiveSessionFloatingControlsProps> = ({
    inkingManager,
    inkingActive,
    setInkingActive,
}) => {
    return (
        <FlexRow
            hAlign="center"
            style={{
                bottom: "12px",
                left: "50%",
                transform: "translate(-50% , 0%)",
                "-webkit-transform": "translate(-50%, 0%)",
                position: "fixed",
                zIndex: 3,
                borderRadius: "4px",
                shadow: tokens.shadow28,
                pointerEvents: "none",
            }}
        >
            <FlexRow
                vAlign="center"
                style={{
                    paddingLeft: "8px",
                    paddingTop: "4px",
                    paddingBottom: "4px",
                    paddingRight: "4px",
                    backgroundColor: tokens.colorNeutralBackground6,
                    borderRadius: "4px",
                    shadow: tokens.shadow28,
                    pointerEvents: "auto",
                }}
            >
                {inkingManager && (
                    <LiveCanvasControls
                        inkingManager={inkingManager}
                        isEnabled={inkingActive}
                        setIsEnabled={setInkingActive}
                    />
                )}
            </FlexRow>
        </FlexRow>
    );
};
