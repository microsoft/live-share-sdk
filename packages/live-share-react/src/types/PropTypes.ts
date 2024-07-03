/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { UserMeetingRole } from "@microsoft/live-share";
import {
    CanvasReferencePoint,
    IBrush,
    IPoint,
    InkingTool,
    LiveCanvasTreeNode,
} from "@microsoft/live-share-canvas";
import { useLiveCanvas } from "../live-hooks";

export type SharedMapInitialData<T> =
    | Map<string, T>
    | readonly (readonly [string, T])[]
    | { [key: string]: T }
    | undefined;

/**
 * Optional props for {@link useLiveCanvas}
 */
export interface IUseLiveCanvasOptionalProps {
    /**
     * Optional. Stateful boolean that will activate/de-activate `InkingManager` accordingly.
     */
    active?: boolean;
    /**
     * Optional. Stateful enum for what tool to use in the `InkingManager`.
     */
    tool?: InkingTool;
    /**
     * Optional. Stateful lineBrush object for the selected lineBrush options to use in `InkingManager`.
     */
    lineBrush?: IBrush;
    /**
     * Optional. Stateful offset point to use in the `InkingManager`. Gets the viewport offset. Defaults to 0,0.
     */
    offset?: IPoint;
    /**
     * Optional. Stateful scale number to use in the `InkingManager`. Defaults to 1 and must be greater than 0.
     */
    scale?: number;
    /**
     * Optional. Stateful reference point enum to use in the `InkingManger`. Defaults to "center".
     */
    referencePoint?: CanvasReferencePoint;
    /**
     * Optional. Stateful boolean flag for whether cursor should be shared in `LiveCanvas`. Defaults to false.
     */
    isCursorShared?: boolean;
    /**
     * Optional. url string for the local user to display alongside their cursor. Defaults to undefined.
     */
    localUserPictureUrl?: string;
    /**
     * Optional. A Fluid `LiveCanvasTree` `TreeNode` instance to swap out the underlying storage solution for strokes.
     * To learn more, look at Fluid's [SharedTree](https://fluidframework.com/docs/data-structures/tree/) documentation.
     */
    node?: LiveCanvasTreeNode;
    /**
     * Optional. The user roles that are allowed to start/stop/pause the timer.
     */
    allowedRoles?: UserMeetingRole[];
}
