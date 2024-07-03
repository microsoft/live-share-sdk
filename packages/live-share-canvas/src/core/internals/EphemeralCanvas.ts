import { DryCanvas } from "../../canvas";
import { InkingManager } from "../InkingManager";

/**
 * @internal
 * Used in {@link InkingManager}
 */
export class EphemeralCanvas extends DryCanvas {
    private _removalTimeout?: number;

    constructor(readonly clientId: string, parentElement?: HTMLElement) {
        super(parentElement);
    }

    scheduleRemoval(onRemoveCallback: (canvas: EphemeralCanvas) => void) {
        if (this._removalTimeout) {
            window.clearTimeout(this._removalTimeout);
        }

        this._removalTimeout = window.setTimeout(() => {
            this.fadeOut();

            onRemoveCallback(this);
        }, InkingManager.ephemeralCanvasRemovalDelay);
    }
}
