import { IBrush } from "../Brush";
import { IPointerPoint, getDistanceBetweenPoints } from "../Geometry";
import { StrokeEndState } from "../InkingManager-constants";
import { StrokeType } from "../Stroke";

/**
 * @internal
 */
export class LiveStroke {
    /**
     * Configures the delay before wet stroke events are emitted, to greatly reduce the
     * number of events emitted and improve performance.
     */
    private static readonly wetStrokeEventsStreamDelay = 60;

    private _points: IPointerPoint[] = [];
    private _processTimeout?: number;

    private process() {
        if (this.type !== StrokeType.persistent) {
            return;
        }

        let index = 0;

        while (index + 2 < this._points.length) {
            const p1 = this._points[index];
            const p2 = this._points[index + 1];
            const p3 = this._points[index + 2];

            const p1p2 = getDistanceBetweenPoints(p1, p2);
            const p2p3 = getDistanceBetweenPoints(p2, p3);
            const p1p3 = getDistanceBetweenPoints(p1, p3);

            const threshold = (p1p2 + p2p3) * (100 / p1p3);

            if (threshold < this.simplificationThreshold) {
                this._points.splice(index + 1, 1);
            } else {
                index++;
            }
        }
    }

    endState?: StrokeEndState;

    constructor(
        readonly id: string,
        readonly type: StrokeType,
        readonly brush: IBrush,
        readonly simplificationThreshold: number
    ) {}

    get points(): IPointerPoint[] {
        return this._points;
    }

    clear() {
        this._points = [];
    }

    scheduleProcessing(onProcessedCallback: (stroke: LiveStroke) => void) {
        if (this._processTimeout === undefined) {
            this._processTimeout = window.setTimeout(() => {
                this.process();

                this._processTimeout = undefined;

                onProcessedCallback(this);
            }, LiveStroke.wetStrokeEventsStreamDelay);
        }
    }
}
