import { LiveShareClient, TestLiveShareHost } from "@microsoft/live-share";
import { LiveCanvas, InkingTool } from "@microsoft/live-share-canvas";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { useEffect, useState, useRef, useCallback } from "react";
import { useLiveCanvas } from "../utils/useLiveCanvas";

const containerSchema = {
    initialObjects: {
        liveCanvas: LiveCanvas,
    },
};

export const LiveCanvasPage = () => {
    const [liveCanvas, setliveCanvas] = useState(undefined);
    const divRef = useRef();
    const { inkingManager } = useLiveCanvas(liveCanvas, divRef.current);

    const setToPen = useCallback(() => {
        if (inkingManager) {
            inkingManager.tool = InkingTool.pen;
        }
    }, [inkingManager]);

    const setToLaserPointer = useCallback(() => {
        if (inkingManager) {
            inkingManager.tool = InkingTool.laserPointer;
        }
    }, [inkingManager]);

    const setToHighlighter = useCallback(() => {
        if (inkingManager) {
            inkingManager.tool = InkingTool.highlighter;
        }
    }, [inkingManager]);

    const setToEraser = useCallback(() => {
        if (inkingManager) {
            inkingManager.tool = InkingTool.pointEraser;
        }
    }, [inkingManager]);

    const setToBlackBrush = useCallback(() => {
        if (inkingManager) {
            inkingManager.penBrush.color = { r: 0, g: 0, b: 0 };
        }
    }, [inkingManager]);

    const setToBlueBrush = useCallback(() => {
        if (inkingManager) {
            inkingManager.penBrush.color = { r: 0, g: 0, b: 255, a: 1 };
        }
    }, [inkingManager]);

    const setToRedBrush = useCallback(() => {
        if (inkingManager) {
            inkingManager.penBrush.color = { r: 255, g: 0, b: 0 };
        }
    }, [inkingManager]);

    const clearCanvas = useCallback(() => {
        if (inkingManager) {
            inkingManager.clear();
        }
    }, [inkingManager]);

    const initialize = async () => {
        const client = new LiveShareClient(TestLiveShareHost.create());
        const { container } = await client.joinContainer(containerSchema);
        setliveCanvas(container.initialObjects.liveCanvas);
    };

    useEffect(() => {
        initialize();
    }, []);

    return (
        <>
            <div id="inkingRoot">
                <div id="inkingHost" ref={divRef}></div>
            </div>
            <div>
                <button onClick={clearCanvas}>Clear</button>
                <button onClick={setToEraser}>Eraser</button>
                <button onClick={setToPen}>Pen</button>
                <button onClick={setToHighlighter}>Highlighter</button>
                <button onClick={setToLaserPointer}>Laser Pointer</button>
                <button onClick={setToBlueBrush}>Blue brush</button>
                <button onClick={setToBlackBrush}>Black brush</button>
                <button onClick={setToRedBrush}>Red brush</button>
            </div>
        </>
    );
};
