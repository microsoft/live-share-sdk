import { IBrush } from "./Brush.js";
import { IPoint, IPointerPoint } from "./Geometry.js";
import { StrokeEndState } from "./InkingManager-constants.js";
import { IStroke, StrokeMode, StrokeType } from "./Stroke.js";

/**
 * Defines the arguments of the PointerMovedEvent.
 */
export interface IPointerMovedEventArgs {
    position?: IPoint;
}

/**
 * Defines the arguments of the BeginStrokeEvent.
 */
export interface IBeginStrokeEventArgs {
    /**
     * The id of the new stroke.
     */
    strokeId: string;
    /**
     * The type of the new stroke.
     */
    type: StrokeType;
    /**
     * The stroke's mode.
     */
    mode: StrokeMode;
    /**
     * The brush of the new stroke.
     */
    brush: IBrush;
    /**
     * The starting point of the new stroke.
     */
    startPoint: IPointerPoint;
}

/**
 * Defines the arguments of the AddPointsEvent.
 */
export interface IAddPointsEventArgs {
    /**
     * The id of the stroke a point has been added to.
     */
    strokeId: string;
    /**
     * The points that were added to the stroke.
     */
    points: IPointerPoint[];
    /**
     * Indicates whether the stroke has ended (i.e. if the points
     * were the last ones.)
     */
    endState?: StrokeEndState;
}

/**
 * Defines a "wet" stroke, i.e. a stroke as it's being drawn.
 */
export interface IWetStroke extends IStroke {
    /**
     * The type of the wet stroke.
     */
    readonly type: StrokeType;
    /**
     * The wet stroke's mode.
     */
    readonly mode: StrokeMode;
    /**
     * Straightens a point so that the line it forms with the previous
     * point is straight (either horizontal or vertical).
     * @param p The point to update
     */
    straighten(p: IPointerPoint): IPointerPoint;
    /**
     * Ends the wet stroke.
     * @param p Optional. The points at which the stroke ends. If not specified,
     * the stroke ends at the last added point.
     */
    end(): void;
    /**
     * Cancels the wet stroke.
     */
    cancel(): void;
}

/**
 * Defines options used by `InkingManager.addStroke` and `InkingManager.removeStroke`.
 */
export interface IAddRemoveStrokeOptions {
    /**
     * Optional. Indicates if the canvas must be fully re-rendered at once after the
     * stroke has been added or removed. Defaults to `false`.
     */
    forceReRender?: boolean;
    /**
     * Optional. Indicates whether the add or remove operation should be added to the
     * change log, which in turn will lead to `StrokeAddedEvent` or `StrokeRemovedEvent`
     * begin emitted. Defaults to `true`.
     */
    addToChangeLog?: boolean;
}
