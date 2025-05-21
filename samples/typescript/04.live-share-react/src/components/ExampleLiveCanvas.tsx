import { useLiveCanvas } from "@microsoft/live-share-react";
import { InkingTool } from "@microsoft/live-share-canvas";
import { FC, useState } from "react";
import { useRef } from "react";
import { FlexRow } from "./internals/flex";

export const ExampleLiveCanvas: FC = () => {
    const liveCanvasRef = useRef<HTMLDivElement | null>(null);
    const [active, setActive] = useState(true);
    const [tool, setTool] = useState(InkingTool.pen);
    const [isCursorShared, setIsCursorShared] = useState(true);
    const { inkingManager, liveCanvas } = useLiveCanvas(
        "CUSTOM-LIVE-CANVAS",
        liveCanvasRef,
        {
            active,
            tool,
            isCursorShared,
        }
    );

    return (
        <div style={{ position: "absolute" }}>
            <FlexRow hAlign="center">
                <div
                    ref={liveCanvasRef}
                    style={{
                        width: "556px",
                        height: "556px",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        borderColor: "1px",
                        marginBottom: "1.5rem",
                    }}
                />
            </FlexRow>
            <div>
                {!!liveCanvas && (
                    <FlexRow gap="small" wrap>
                        <button
                            onClick={() => {
                                setActive(!active);
                            }}
                        >
                            {active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                            onClick={() => {
                                setIsCursorShared(!isCursorShared);
                            }}
                        >
                            {isCursorShared
                                ? "Disable cursors"
                                : "Enable cursors"}
                        </button>
                        <button
                            onClick={() => {
                                setTool(InkingTool.pen);
                            }}
                        >
                            {"Pen"}
                        </button>
                        <button
                            onClick={() => {
                                setTool(InkingTool.highlighter);
                            }}
                        >
                            {"Highlighter"}
                        </button>
                        <button
                            onClick={() => {
                                setTool(InkingTool.laserPointer);
                            }}
                        >
                            {"Laser pointer"}
                        </button>
                        <button
                            onClick={() => {
                                setTool(InkingTool.eraser);
                            }}
                        >
                            {"Eraser"}
                        </button>
                        <button
                            onClick={() => {
                                inkingManager?.clear();
                            }}
                        >
                            {"Clear"}
                        </button>
                        <button
                            onClick={() => {
                                liveCanvas?.undo();
                            }}
                        >
                            {"Undo"}
                        </button>
                        <button
                            onClick={() => {
                                liveCanvas?.redo();
                            }}
                        >
                            {"Redo"}
                        </button>
                    </FlexRow>
                )}
            </div>
        </div>
    );
};
