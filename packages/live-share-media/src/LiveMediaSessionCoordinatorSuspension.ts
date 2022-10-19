/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import {
    MediaSessionCoordinatorSuspension,
    CoordinationWaitPoint,
} from "./MediaSessionExtensions";

export class LiveMediaSessionCoordinatorSuspension
    implements MediaSessionCoordinatorSuspension
{
    private _waitPoint?: CoordinationWaitPoint;
    private _onEnd: (seekTo?: number) => void;

    constructor(
        waitPoint: CoordinationWaitPoint | undefined,
        onEnd: (seekTo?: number) => void
    ) {
        this._waitPoint = waitPoint;
        this._onEnd = onEnd;
    }

    /**
     * Returns an optional wait point associated with the suspension.
     */
    public get waitPoint(): CoordinationWaitPoint | undefined {
        return this._waitPoint;
    }

    /**
     * Ends the suspension and optionally proposes a time to seek to.
     * @param seekTo Optional. Proposed time to seek to. Ignored for suspensions at wait points.
     */
    public end(seekTo?: number): void {
        this._onEnd(seekTo);
    }
}
