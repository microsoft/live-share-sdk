/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { InkingManager, LiveCanvas } from "@microsoft/live-share-canvas";
import React from "react";
import { useDynamicDDS } from "../shared-hooks";
import { IUseLiveCanvasOptionalProps, IUseLiveCanvasResults } from "../types";
import { isRefObject } from "../utils";
import { getRawNode } from "../shared-hooks/internals/tree-node-utils";
import { LiveDataObjectInitializeState } from "@microsoft/live-share";

/**
 * React hook for using a Live Share Canvas `LiveCanvas` and `InkingManager`.
 *
 * @remarks
 * Use this hook to set up an `LiveCanvas` object, which is used for collaborative inking. It takes several input parameters, including a unique key,
 * a reference to a canvas element, and various settings for the inking tool, brush, and canvas offset and scale.
 * This hook can only be used in a child component of `<LiveShareProvider>` or `<AzureProvider>`.
 *
 * @param uniqueKey the unique key for the `LiveCanvas`. If one does not yet exist, a new one.
 * @param canvasElementRef the HTML div element ref or document ID that `InkingManager` will use for canvas-based collaboration.
 * @param props Optional. Other optional props.
 * @param props.active Optional. Stateful boolean that will activate/de-activate `InkingManager` accordingly.
 * @param props.tool Optional. Stateful enum for what tool to use in the `InkingManager`.
 * @param props.lineBrush Optional. Stateful lineBrush object for the selected lineBrush options to use in `InkingManager`.
 * @param props.offset Optional. Stateful offset point to use in the `InkingManager`. Gets the viewport offset. Defaults to 0,0.
 * @param props.scale Optional. Stateful scale number to use in the `InkingManager`. Defaults to 1 and must be greater than 0.
 * @param props.referencePoint Optional. Stateful reference point enum to use in the `InkingManger`. Defaults to "center".
 * @param props.isCursorShared Optional. Stateful boolean flag for whether cursor should be shared in `LiveCanvas`. Defaults to false.
 * @param props.localUserPictureUrl Optional. url string for the local user to display alongside their cursor. Defaults to undefined.
 * @param props.node Optional. A Fluid `LiveCanvasTree` `TreeNode` instance to swap out the underlying storage solution for strokes.
 * To learn more, look at Fluid's [SharedTree](https://fluidframework.com/docs/data-structures/tree/) documentation.
 * @param allowedRoles Optional. The user roles that are allowed to start/stop/pause the timer.
 *
 * @returns `IUseLiveCanvasResults` object that contains the `liveCanvas` data object and `inkingManager`.
 */
export function useLiveCanvas(
    uniqueKey: string,
    canvasElementRef: React.RefObject<HTMLElement | null> | string,
    props: IUseLiveCanvasOptionalProps
): IUseLiveCanvasResults {
    /**
     * User facing: inking manager instance
     */
    const [inkingManager, setInkingManager] = React.useState<InkingManager>();

    /**
     * User facing: dynamically load the DDS for the given unique key.
     */
    const { dds: liveCanvas } = useDynamicDDS<LiveCanvas>(
        uniqueKey,
        LiveCanvas
    );

    // This should change less frequently then node if they are using `useTreeNode`
    // We need the raw node anyways to apply event listeners
    const rawNode = getRawNode(props?.node);

    /**
     * Setup the InkingManager and LiveCanvas
     */
    React.useEffect(
        () => {
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
            // Clear out existing nodes
            function removeAllChildren(node: HTMLElement | ChildNode) {
                node.childNodes.forEach((childNode) => {
                    removeAllChildren(childNode);
                    childNode.remove();
                });
            }
            removeAllChildren(htmlElement);
            // Create the InkingManager and initialize the liveCanvas with it
            const inkingManager = new InkingManager(htmlElement);
            setInkingManager(inkingManager);
            liveCanvas.initialize(inkingManager, props?.allowedRoles, rawNode);

            // cleanup function to be called when the component is unmount
            return () => {
                inkingManager.removeAllListeners();
            };
        },
        // Intentionally ommitting rawNode from deps because we only want to initialize once,
        // whereas rawNode may change many times.
        [liveCanvas, props?.allowedRoles]
    );

    /**
     * Set the node if it changes while LiveCanvas is initialized
     */
    React.useEffect(() => {
        if (
            !rawNode ||
            liveCanvas?.initializeState !==
                LiveDataObjectInitializeState.succeeded
        )
            return;
        liveCanvas.setTreeNode(rawNode);
    }, [liveCanvas, rawNode]);

    /**
     * Activate or deactivate the inkingManager based on the 'active' prop
     */
    React.useEffect(() => {
        if (inkingManager && props?.active !== undefined) {
            if (props?.active) {
                inkingManager.activate();
            } else {
                inkingManager.deactivate();
            }
        }
    }, [props?.active, inkingManager]);

    /**
     * Sets the tool of the inkingManager based on the 'tool' prop
     */
    React.useEffect(() => {
        if (inkingManager && props?.tool !== undefined) {
            inkingManager.tool = props.tool;
        }
    }, [props?.tool, inkingManager]);

    /**
     * Sets the offset of the inkingManager based on the 'offset' prop
     */
    React.useEffect(() => {
        if (inkingManager && props?.offset !== undefined) {
            inkingManager.offset = {
                x: props?.offset.x,
                y: props?.offset.y,
            };
        }
    }, [props?.offset?.x, props?.offset?.y, inkingManager]);

    /**
     * Sets the scale of the inkingManager based on the 'scale' prop
     */
    React.useEffect(() => {
        if (inkingManager && props?.scale !== undefined) {
            inkingManager.scale = props?.scale;
        }
    }, [props?.scale, inkingManager]);

    /**
     * Sets the referencePoint of the inkingManager based on the 'referencePoint' prop
     */
    React.useEffect(() => {
        if (inkingManager && props?.referencePoint !== undefined) {
            inkingManager.referencePoint = props?.referencePoint;
        }
    }, [props?.referencePoint, inkingManager]);

    /**
     * Sets the lineBrush of the inkingManager based on the 'lineBrush' prop
     */
    React.useEffect(() => {
        if (inkingManager && props?.lineBrush) {
            inkingManager.lineBrush = {
                color: props.lineBrush.color,
                tip: props.lineBrush.tip,
                tipSize: props.lineBrush.tipSize,
                type: props.lineBrush.type,
                endArrow: props.lineBrush.endArrow,
            };
        }
    }, [
        props?.lineBrush?.color,
        props?.lineBrush?.tip,
        props?.lineBrush?.tipSize,
        props?.lineBrush?.type,
        props?.lineBrush?.endArrow,
        inkingManager,
    ]);

    /**
     * Sets the isCursorShared of the liveCanvas based on the 'isCursorShared' prop
     */
    React.useEffect(() => {
        if (liveCanvas && props?.isCursorShared !== undefined) {
            liveCanvas.isCursorShared = props.isCursorShared;
        }
    }, [props?.isCursorShared, liveCanvas]);

    /**
     * Sets the onGetLocalUserInfo method of the liveCanvas based on the 'localUserCursor' prop
     */
    React.useEffect(() => {
        if (liveCanvas && props?.localUserPictureUrl) {
            liveCanvas.onGetLocalUserPictureUrl = (): string | undefined => {
                return props.localUserPictureUrl;
            };
        }
    }, [props?.localUserPictureUrl, liveCanvas]);

    /**
     * Return hook response
     */
    return {
        inkingManager,
        liveCanvas,
    };
}
