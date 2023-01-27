import {
    CanvasReferencePoint,
    IBrush,
    InkingManager,
    InkingTool,
    IPoint,
    IUserInfo,
    LiveCanvas,
} from "@microsoft/live-share-canvas";
import { RefObject, useEffect, useRef, useState } from "react";
import { useDynamicDDS } from "../shared-hooks";
import { isRefObject } from "../utils";

export function useLiveCanvas(
    uniqueKey: string,
    canvasElementRef: RefObject<HTMLElement | null> | string,
    active?: boolean,
    tool?: InkingTool,
    lineBrush?: IBrush,
    offset?: IPoint,
    scale?: number,
    referencePoint?: CanvasReferencePoint,
    isCursorShared?: boolean,
    localUserCursor?: IUserInfo
): {
    inkingManager: InkingManager | undefined;
    liveCanvas: LiveCanvas | undefined;
} {
    const listeningRef = useRef(false);
    const [inkingManager, setInkingManager] = useState<InkingManager>();

    const { dds: liveCanvas } = useDynamicDDS<LiveCanvas>(
        `<LiveCanvas>:${uniqueKey}`,
        LiveCanvas
    );

    useEffect(() => {
        if (listeningRef.current || !liveCanvas) return;
        let htmlElement: HTMLElement | null;
        if (isRefObject(canvasElementRef)) {
            htmlElement = canvasElementRef.current;
        } else {
            htmlElement = document.getElementById(canvasElementRef);
        }
        if (htmlElement === null) return;
        listeningRef.current = true;
        const inkingManager = new InkingManager(htmlElement);
        setInkingManager(inkingManager);
        liveCanvas.initialize(inkingManager);
        console.log("useLiveCanvas initialize");

        return () => {
            listeningRef.current = false;
            liveCanvas.dispose();
            console.log("useLiveCanvas dispose");
        };
    }, [liveCanvas]);

    useEffect(() => {
        if (inkingManager && active !== undefined) {
            if (active) {
                inkingManager.activate();
            } else {
                inkingManager.deactivate();
            }
        }
    }, [active, inkingManager]);

    useEffect(() => {
        if (inkingManager && tool !== undefined) {
            inkingManager.tool = tool;
        }
    }, [tool, inkingManager]);

    useEffect(() => {
        if (inkingManager && offset !== undefined) {
            inkingManager.offset = {
                x: offset.x,
                y: offset.y,
            };
        }
    }, [offset?.x, offset?.y, inkingManager]);

    useEffect(() => {
        if (inkingManager && scale !== undefined) {
            inkingManager.scale = scale;
        }
    }, [scale, inkingManager]);

    useEffect(() => {
        if (inkingManager && referencePoint !== undefined) {
            inkingManager.referencePoint = referencePoint;
        }
    }, [referencePoint, inkingManager]);

    useEffect(() => {
        if (inkingManager && lineBrush) {
            inkingManager.lineBrush = {
                color: lineBrush.color,
                tip: lineBrush.tip,
                tipSize: lineBrush.tipSize,
                type: lineBrush.type,
                endArrow: lineBrush.endArrow,
            };
        }
    }, [
        lineBrush?.color,
        lineBrush?.tip,
        lineBrush?.tipSize,
        lineBrush?.type,
        lineBrush?.endArrow,
        inkingManager,
    ]);

    useEffect(() => {
        if (liveCanvas && isCursorShared !== undefined) {
            liveCanvas.isCursorShared = isCursorShared;
        }
    }, [isCursorShared, liveCanvas]);

    useEffect(() => {
        if (liveCanvas && localUserCursor) {
            liveCanvas.onGetLocalUserInfo = (): IUserInfo | undefined => {
                return {
                    displayName: localUserCursor.displayName,
                    pictureUri: localUserCursor.pictureUri,
                };
            };
        }
    }, [localUserCursor?.displayName, localUserCursor?.pictureUri, liveCanvas]);

    return {
        inkingManager,
        liveCanvas,
    };
}
