import { useLiveCanvas } from "@microsoft/live-share-react";
import { InkingTool } from "@microsoft/live-share-canvas";
import { useState } from "react";
import { useRef } from "react";

export const ExampleLiveCanvas = () => {
    const liveCanvasRef = useRef(null);
    const [active, setActive] = useState(true);
    const [tool, setTool] = useState(InkingTool.pen);
    const [isCursorShared, setIsCursorShared] = useState(true);
    const { liveCanvas } = useLiveCanvas("CUSTOM-LIVE-CANVAS", liveCanvasRef, {
        active,
        tool,
        isCursorShared,
    });

    return (
        <div style={{ position: "absolute" }}>
            <div
                ref={liveCanvasRef}
                style={{ width: "556px", height: "224px" }}
            />
            {!!liveCanvas && (
                <div>
                    <button
                        onClick={() => {
                            setActive(!active);
                        }}
                    >
                        {"Toggle Active"}
                    </button>
                    <button
                        onClick={() => {
                            setIsCursorShared(!isCursorShared);
                        }}
                    >
                        {"Toggle Cursor"}
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
                            setTool(InkingTool.laserPointer);
                        }}
                    >
                        {"Laser pointer"}
                    </button>
                </div>
            )}
        </div>
    );
};
