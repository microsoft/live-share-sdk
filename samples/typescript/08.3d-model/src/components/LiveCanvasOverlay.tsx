import { useLiveCanvas } from "@microsoft/live-share-react";
import { PointerInputProvider } from "@microsoft/live-share-canvas";
import { FC, useRef, useEffect, MutableRefObject, useState } from "react";
import { NonClickablePointerInputProvider } from "../utils/NonClickablePointerInputProvider";
import { LiveSessionControls } from "./LiveSessionControls";

interface ILiveCanvasOverlayProps {
    pointerElementRef: MutableRefObject<HTMLElement | null>;
    followingUserId: string;
    zPosition: number;
}

const liveCanvasProps = {
    isCursorShared: true,
    active: true,
};

export const LiveCanvasOverlay: FC<ILiveCanvasOverlayProps> = ({
    pointerElementRef,
    // followingUserId,
    // zPosition,
}) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [inkingActive, setInkingActive] = useState(false);
    const { inkingManager } = useLiveCanvas(
        `live-canvas`, // uniqueKey
        canvasRef, // pointer to div element that we want to host <canvas> element within
        liveCanvasProps
    );

    useEffect(() => {
        if (!inkingManager || !pointerElementRef.current) return;
        // While inking is active, we use the default `PointerInputProvider` used in `InkingManager` normally.
        // This will prevent scrolling and clicking on the underlying content, which is expected.
        // When inking is not active, our `NonClickablePointerInputProvider` changes the pointer input element to point to the pointerElement.
        // This is because the `<canvas>` overlay is set to disable pointer events, so that users can still click below it.
        // By using the element that contains the page's content, we can get the cursor positions as the mouse moves while also allowing clicks underneath it.
        // The cursors and strokes from other users will still be rendered inside of the <canvas> element.
        inkingManager.inputProvider = inkingActive
            ? new PointerInputProvider(
                  canvasRef!.current!.getElementsByTagName("canvas")[0]
              )
            : new NonClickablePointerInputProvider(pointerElementRef.current);
        inkingManager.inputProvider.activate();
        return () => {
            inkingManager.inputProvider.deactivate();
        };
    }, [inkingManager, pointerElementRef, inkingActive]);

    return (
        <>
            <div
                ref={canvasRef}
                style={{
                    position: "absolute",
                    left: 0,
                    top: 56,
                    bottom: 0,
                    right: 0,
                    pointerEvents: inkingActive ? "auto" : "none",
                    backgroundColor: "transparent",
                }}
            />
            <LiveSessionControls
                inkingActive={inkingActive}
                inkingManager={inkingManager}
                setInkingActive={setInkingActive}
            />
        </>
    );
};

function mapZToScale(
    z_current: number,
    z_min: number = 0,
    z_max: number = 200,
    scale_min: number = 0,
    scale_max: number = 2
): number {
    let scale_range = Math.log(scale_max - scale_min + 1);
    let z_range = z_max - z_min;

    let normalized_z = 1 - (Math.abs(z_current) - z_min) / z_range;

    return scale_min + (Math.exp(normalized_z * scale_range) - 1);
}
