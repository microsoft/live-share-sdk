import {
    IStrokeCreationOptions,
    Stroke,
    StrokeMode,
    StrokeType,
} from "../Stroke.js";
import { InkingCanvas } from "../../canvas/index.js";
import { IWetStroke } from "../InkingManager-interfaces.js";
import { IPointerPoint } from "../Geometry.js";
import { computeEndArrow } from "./utils.js";

/**
 * @internal
 */
export abstract class WetStroke extends Stroke implements IWetStroke {
    protected notifyStrokeEnded(isCancelled: boolean) {
        if (this.onStrokeEnded) {
            this.onStrokeEnded(this, isCancelled);
        }
    }

    onStrokeEnded?: (sender: WetStroke, isCancelled: boolean) => void;

    constructor(
        private _canvas: InkingCanvas,
        readonly type: StrokeType,
        readonly mode: StrokeMode,
        options?: IStrokeCreationOptions
    ) {
        super(options);

        this._canvas.setBrush(this.brush);
    }

    straighten(p: IPointerPoint): IPointerPoint {
        return p;
    }

    end() {
        this._canvas.removeFromDOM();
        this._canvas.endStroke();

        this.notifyStrokeEnded(false);
    }

    cancel() {
        this._canvas.removeFromDOM();
        this._canvas.cancelStroke();

        this.notifyStrokeEnded(true);
    }

    get canvas(): InkingCanvas {
        return this._canvas;
    }
}

export class WetFreehandStroke extends WetStroke {
    addPoints(...points: IPointerPoint[]): boolean {
        const currentLength = this.length;
        const result = super.addPoints(...points);

        if (result) {
            let startIndex = currentLength;

            if (startIndex === 0) {
                this.canvas.beginStroke(this.getPointAt(0));

                startIndex = 1;
            }

            for (let i = startIndex; i < this.length; i++) {
                this.canvas.addPoint(this.getPointAt(i));
            }
        }

        return result;
    }

    end() {
        if (this.length > 1 && this.brush.endArrow === "open") {
            const penultimatePoint = this.getPointAt(this.length - 2);
            const lastPoint = this.getPointAt(this.length - 1);

            const arrowPath = computeEndArrow(penultimatePoint, lastPoint);

            for (let i = 0; i < arrowPath.length; i++) {
                const p = { ...arrowPath[i], pressure: lastPoint.pressure };

                this.addPoint(p);
            }
        }

        super.end();
    }
}

/**
 * @internal
 */
export class WetLineStroke extends WetStroke {
    straighten(p: IPointerPoint): IPointerPoint {
        const result = { ...p };

        if (this.length > 0) {
            const firstPoint = this.getPointAt(0);

            if (
                Math.abs(result.x - firstPoint.x) >
                Math.abs(result.y - firstPoint.y)
            ) {
                result.y = firstPoint.y;
            } else {
                result.x = firstPoint.x;
            }
        }

        return result;
    }

    addPoints(...points: IPointerPoint[]): boolean {
        if (this.length === 0) {
            this.addPoint(points[0]);

            if (points.length > 1) {
                this.addPoint(points[points.length - 1]);
            }
        } else {
            const firstPoint = this.getPointAt(0);

            this.clear();

            this.addPoint(firstPoint);
            this.addPoint(points[points.length - 1]);
        }

        this.canvas.cancelStroke();
        this.canvas.beginStroke(this.getPointAt(0));

        if (this.length > 1) {
            this.canvas.addPoint(this.getPointAt(1));

            if (this.brush.endArrow === "open") {
                const arrowPath = computeEndArrow(
                    this.getPointAt(0),
                    this.getPointAt(1)
                );

                for (let i = 0; i < arrowPath.length; i++) {
                    const p = {
                        ...arrowPath[i],
                        pressure: this.getPointAt(1).pressure,
                    };

                    this.addPoint(p);
                    this.canvas.addPoint(p);
                }
            }
        }

        return true;
    }
}
