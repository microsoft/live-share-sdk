import { DataObject, DataObjectTypes } from "@fluidframework/aqueduct";
import { LiveShareRuntime } from "./LiveShareRuntime";
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
    private _liveRuntime: LiveShareRuntime | null = null;

    /**
     * `ILiveShareHost` instance to inject
     * @remarks
     * You should usually not set this value to a DDS after calling `.initialize()`, but there is nothing preventing it.
     */
    public get liveRuntime(): LiveShareRuntime {
        assert(
            this._liveRuntime !== null,
            "LiveShareRuntime not initialized. Ensure your Fluid `ContainerSchema` was first wrapped inside of `getLiveShareSchema`, or use `.joinContainer()` in `LiveShareClient`."
        );
        return this._liveRuntime;
    }
    public set liveRuntime(value: LiveShareRuntime) {
        this._liveRuntime = value;
    }
}
