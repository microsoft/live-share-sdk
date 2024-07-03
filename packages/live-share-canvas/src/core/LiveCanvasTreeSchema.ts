import { SchemaFactory, Tree, TreeViewConfiguration } from "fluid-framework";
import { LiveCanvas } from "./LiveCanvas";
import { IBrush } from "./Brush";
import { IStroke, Stroke } from "./Stroke";
import { IColor } from "./Colors";

/**
 * The `SchemaFactory` used in the `SharedTree` instance of {@link LiveCanvas}.
 */
export const sf = new SchemaFactory(
    "LiveCanvas-99059925-e384-44af-82ae-31c5a824cb46"
);

/**
 * `SharedTree` for {@link IColor}
 */
export class LiveCanvasColor extends sf.object("Color", {
    r: sf.number,
    g: sf.number,
    b: sf.number,
}) {
    //
}

/**
 * `SharedTree` schema for {@link IBrush}.
 */
export class LiveCanvasBrush extends sf.object("Brush", {
    type: sf.string,
    color: LiveCanvasColor,
    tip: sf.string,
    tipSize: sf.number,
    endArrow: sf.optional(sf.string),
}) {
    //
}

/**
 * `SharedTree` schema for {@link Stroke}.
 */
export class LiveCanvasStroke extends sf.object("LiveCanvasStroke", {
    /**
     * Unique id of stroke
     */
    id: sf.string,
    /**
     * Version number of stroke
     */
    version: sf.number,
    /**
     * Client id that made the stroke
     */
    clientId: sf.optional(sf.string),
    /**
     * Timestamp the stroke was created
     */
    timestamp: sf.number,
    /**
     * Type of brush.
     * See {@link IBrush}
     */
    brush: LiveCanvasBrush,
    /**
     * Serialized points
     */
    points: sf.string,
}) {
    private get serializeString(): string {
        const strokeData = {
            v: this.version,
            id: this.id,
            cId: this.clientId,
            t: this.timestamp,
            br: this.brush,
            d: this.points,
        };

        return JSON.stringify(strokeData);
    }
    deserialize(existingStroke?: IStroke): IStroke {
        const stroke = existingStroke ?? new Stroke();
        stroke.deserialize(this.serializeString);
        return stroke;
    }

    static fromStroke(stroke: IStroke): LiveCanvasStroke {
        return new LiveCanvasStroke({
            id: stroke.id,
            version: stroke.version,
            clientId: stroke.clientId,
            timestamp: stroke.timeStamp,
            brush: new LiveCanvasBrush({
                type: stroke.brush.type,
                color: new LiveCanvasColor({
                    ...stroke.brush.color,
                }),
                tip: stroke.brush.tip,
                tipSize: stroke.brush.tipSize,
                endArrow: stroke.brush.endArrow,
            }),
            points: stroke.serializePoints(),
        });
    }
}

/**
 * `SharedTree` schema for map of {@link LiveCanvasStroke} nodes.
 */
export class LiveCanvasStrokesMap extends sf.map(
    "LiveCanvasStrokesMap",
    LiveCanvasStroke
) {}

/**
 * `SharedTree` schema used by {@link LiveCanvas}
 */
export class LiveCanvasTreeNode extends sf.object("LiveCanvasTree", {
    dryInkMap: LiveCanvasStrokesMap,
}) {
    //
}

/**
 * @hidden
 */
export const treeViewConfiguration = new TreeViewConfiguration({
    schema: LiveCanvasTreeNode,
});
