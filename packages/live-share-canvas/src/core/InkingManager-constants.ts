/**
 * Defines available inking tools.
 */
export enum InkingTool {
    pen = 0,
    laserPointer = 1,
    highlighter = 2,
    eraser = 3,
    pointEraser = 4,
    line = 5,
}

/**
 * The event emitted by InkingManager when the canvas is cleared.
 */
export const ClearEvent = "Clear";
/**
 * The event emitted by InkingManager when a stroked is added.
 */
export const StrokesAddedEvent = "StrokesAdded";
/**
 * The event emitted by InkingManager when a stroked is removed.
 */
export const StrokesRemovedEvent = "StrokesRemoved";

/**
 * The event emitted by InkingManager when the pointer moves over the canvas.
 */
export const PointerMovedEvent = "PointerMoved";

/**
 * The event emitted by InkingManager when a stroke begins.
 */
export const BeginStrokeEvent = "BeginStroke";

/**
 * Why the stroke state ended
 */
export enum StrokeEndState {
    ended,
    cancelled,
}

/**
 * The event emitted by InkingManager when points are added to
 * the current stroke.
 */
export const AddPointsEvent = "AddPoints";
