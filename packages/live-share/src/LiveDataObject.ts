import { DataObject, DataObjectTypes } from "@fluidframework/aqueduct";
import { LiveShareRuntime } from "./LiveDataObjectRuntime";
import { assert } from "@fluidframework/common-utils";

/**
 * Extends Fluid's DataObject class. Intended for use with Live Share custom DDS's that rely on a `ILiveShareHost`.
 */
export abstract class LiveDataObject<
    I extends DataObjectTypes = DataObjectTypes
> extends DataObject<I> {
    /**
     * @hidden
     */
    public static LiveEnabled = true;

    /**
     * @hidden
     */
    public _liveRuntime: LiveShareRuntime | null = null;

    /**
     * ILiveShareHost instance to inject
     */
    protected get liveRuntime(): LiveShareRuntime {
        // return new LiveDataObjectRuntime(TestLiveShareHost.create());
        assert(
            this._liveRuntime !== null,
            "LiveDataObjectRuntime not initialized. Ensure your Fluid `ContainerSchema` was first wrapped inside of `getLiveShareSchema`, or use `.joinContainer()` in `LiveShareClient`."
        );
        return this._liveRuntime;
    }
}
