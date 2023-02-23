/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    CanvasReferencePoint,
    IBrush,
    InkingManager,
    InkingTool,
    IPoint,
    IUserInfo,
    LiveCanvas,
} from "@microsoft/live-share-canvas";
import React from "react";
import { useDynamicDDS } from "../shared-hooks";
import { IUseLiveCanvasResults } from "../types";
import { isRefObject } from "../utils";

/**
 * React hook for using a Live Share Canvas `LiveCanvas` and `InkingManager`.
 *
 * @remarks
 * Use this hook to set up an `LiveCanvas` object, which is used for collaborative inking. It takes several input parameters, including a unique key,
 * a reference to a canvas element, and various settings for the inking tool, brush, and canvas offset and scale.
 *
 * @param uniqueKey the unique key for the `LiveCanvas`. If one does not yet exist, a new one.
 * @param canvasElementRef the HTML div element ref or document ID that `InkingManager` will use for canvas-based collaboration.
 * @param active Optional. Stateful boolean that will activate/de-activate `InkingManager` accordingly.
 * @param tool Optional. Stateful enum for what tool to use in the `InkingManager`.
 * @param lineBrush Optional. Stateful lineBrush object for the selected lineBrush options to use in `InkingManager`.
 * @param offset Optional. Stateful offset point to use in the `InkingManager`. Gets the viewport offset. Defaults to 0,0.
 * @param scale Optional. Stateful scale number to use in the `InkingManager`. Defaults to 1 and must be greater than 0.
 * @param referencePoint Optional. Stateful reference point enum to use in the `InkingManger`. Defaults to "center".
 * @param isCursorShared Optional. Stateful boolean flag for whether cursor should be shared in `LiveCanvas`. Defaults to false.
 * @param localUserCursor Optional. Stateful `IUserInfo` object for the local user's metadata to display alongside their cursor. Defaults to undefined.
 * @returns IUseLiveCanvasResults object that contains the `liveCanvas` data object and `inkingManager`.
 */
export function useLiveCanvas(
    uniqueKey: string,
    canvasElementRef: React.RefObject<HTMLElement | null> | string,
    active?: boolean,
    tool?: InkingTool,
    lineBrush?: IBrush,
    offset?: IPoint,
    scale?: number,
    referencePoint?: CanvasReferencePoint,
    isCursorShared?: boolean,
    localUserCursor?: IUserInfo
): IUseLiveCanvasResults {
    /**
     * User facing: inking manager instance
     */
    const [inkingManager, setInkingManager] = React.useState<InkingManager>();

    /**
     * User facing: dynamically load the DDS for the given unique key.
     */
    const { dds: liveCanvas } = useDynamicDDS<LiveCanvas>(uniqueKey, LiveCanvas);

    /**
     * Setup the InkingManager and LiveCanvas
     */
    React.useEffect(() => {
        // if the component is already listening or liveCanvas is not yet initialized, return
        if (!liveCanvas) return;
        // get the canvas element from the ref or document
        let htmlElement: HTMLElement | null;
        if (isRefObject(canvasElementRef)) {
            htmlElement = canvasElementRef.current;
        } else {
            htmlElement = document.getElementById(canvasElementRef);
        }
        if (htmlElement === null) return;
        // Create the InkingManager and initialize the liveCanvas with it
        const inkingManager = new InkingManager(htmlElement);
        setInkingManager(inkingManager);
        liveCanvas.initialize(inkingManager);

        // cleanup function to be called when the component is unmount
        return () => {
            liveCanvas.dispose();
            inkingManager.removeAllListeners();
        };
    }, [liveCanvas]);

    /**
     * Activate or deactivate the inkingManager based on the 'active' prop
     */
    React.useEffect(() => {
        if (inkingManager && active !== undefined) {
            if (active) {
                inkingManager.activate();
            } else {
                inkingManager.deactivate();
            }
        }
    }, [active, inkingManager]);

    /**
     * Sets the tool of the inkingManager based on the 'tool' prop
     */
    React.useEffect(() => {
        if (inkingManager && tool !== undefined) {
            inkingManager.tool = tool;
        }
    }, [tool, inkingManager]);

    /**
     * Sets the offset of the inkingManager based on the 'offset' prop
     */
    React.useEffect(() => {
        if (inkingManager && offset !== undefined) {
            inkingManager.offset = {
                x: offset.x,
                y: offset.y,
            };
        }
    }, [offset?.x, offset?.y, inkingManager]);

    /**
     * Sets the scale of the inkingManager based on the 'scale' prop
     */
    React.useEffect(() => {
        if (inkingManager && scale !== undefined) {
            inkingManager.scale = scale;
        }
    }, [scale, inkingManager]);

    /**
     * Sets the referencePoint of the inkingManager based on the 'referencePoint' prop
     */
    React.useEffect(() => {
        if (inkingManager && referencePoint !== undefined) {
            inkingManager.referencePoint = referencePoint;
        }
    }, [referencePoint, inkingManager]);

    /**
     * Sets the lineBrush of the inkingManager based on the 'lineBrush' prop
     */
    React.useEffect(() => {
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

    /**
     * Sets the isCursorShared of the liveCanvas based on the 'isCursorShared' prop
     */
    React.useEffect(() => {
        if (
            liveCanvas?.isCursorShared !== undefined &&
            isCursorShared !== undefined
        ) {
            liveCanvas.isCursorShared = isCursorShared;
        }
    }, [isCursorShared, liveCanvas?.isCursorShared]);

    /**
     * Sets the onGetLocalUserInfo method of the liveCanvas based on the 'localUserCursor' prop
     */
    React.useEffect(() => {
        if (liveCanvas?.onGetLocalUserInfo !== undefined && localUserCursor) {
            liveCanvas.onGetLocalUserInfo = (): IUserInfo | undefined => {
                return {
                    displayName: localUserCursor.displayName,
                    pictureUri: localUserCursor.pictureUri,
                };
            };
        }
    }, [
        localUserCursor?.displayName,
        localUserCursor?.pictureUri,
        liveCanvas?.onGetLocalUserInfo,
    ]);

    /**
     * Return hook response
     */
    return {
        inkingManager,
        liveCanvas,
    };
}
