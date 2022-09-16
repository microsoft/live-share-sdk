/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IPointerPoint } from "../core";
import { WetCanvas } from "./DryWetCanvas";

/**
 * Represents a canvas that implements the laser pointer behavior.
 */
export class LaserPointerCanvas extends WetCanvas {
    private static readonly TrailingPointsRemovalInterval = 20;

    private _trailingPointsRemovalInterval?: number;

    private scheduleTrailingPointsRemoval() {
        if (this._trailingPointsRemovalInterval === undefined && this.points.length > 1) {
            this._trailingPointsRemovalInterval = window.setTimeout(
                () => {
                    const pointsToRemove = Math.ceil((this.points.length - 1) / 5);

                    this.points.splice(0, pointsToRemove);

                    if (this.points.length > 0) {
                        let currentPressure = 0.5;
                        const pressureStep = (0.9 - currentPressure) / this.points.length;

                        for (let i = this.points.length - 1; i >= 0; i--) {
                            this.points[i].pressure = currentPressure;

                            currentPressure -= pressureStep;
                        }
                    }

                    this._trailingPointsRemovalInterval = undefined;

                    this.scheduleRender();
                    this.scheduleTrailingPointsRemoval();
                },
                LaserPointerCanvas.TrailingPointsRemovalInterval);
        }
    }

    private cancelTralingPointRemoval() {
        if (this._trailingPointsRemovalInterval !== undefined) {
            window.clearInterval(this._trailingPointsRemovalInterval);

            this._trailingPointsRemovalInterval = undefined;
        }
    }

    protected internalAddPoint(p: IPointerPoint) {
        super.internalAddPoint(p);

        this.scheduleTrailingPointsRemoval();
    }

    protected internalEndStroke(p?: IPointerPoint) {
        this.cancelTralingPointRemoval();

        super.internalEndStroke(p);
    }

    protected internalCancelStroke() {
        this.cancelTralingPointRemoval();

        super.internalCancelStroke();
    }

    protected rendersProgressively(): boolean {
        return false;
    }

    removeFromDOM() {
        super.removeFromDOM();

        this.cancelTralingPointRemoval();
    }
}