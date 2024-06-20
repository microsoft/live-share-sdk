import { DataObject } from "@fluidframework/aqueduct/internal";
import { type ISharedDirectory } from "@fluidframework/map/internal";
import { type IFluidDataStoreRuntime } from "@fluidframework/datastore-definitions";
import { IFluidContainer } from "@fluidframework/fluid-static";

/**
 * @hidden
 */
export const TurboDirectory = "TURBO_DIRECTORY";

/**
 * @hidden
 */
export const TurboStateMap = "TURBO_STATE_MAP";

/**
 * @hidden
 */
export const TurboDynamicObjects = "TURBO_DYNAMIC_OBJECTS";

/**
 * @hidden
 */
export function getRootDataObject(container: IFluidContainer): DataObject {
    interface RootDataObjectSmuggler {
        rootDataObject: DataObject;
    }
    const blah = container as unknown as RootDataObjectSmuggler;
    return blah.rootDataObject;
}

/**
 * @hidden
 */
export function getRootDirectory(rootDataObject: DataObject): ISharedDirectory {
    interface RootDataObjectDirectorymuggler {
        root: ISharedDirectory;
    }
    const blah = rootDataObject as unknown as RootDataObjectDirectorymuggler;
    return blah.root;
}

/**
 * @hidden
 */
export function getContainerRuntime(
    rootDataObject: DataObject
): IFluidDataStoreRuntime {
    interface RootDataObjectRuntimeSmuggler {
        runtime: IFluidDataStoreRuntime;
    }
    const blah = rootDataObject as unknown as RootDataObjectRuntimeSmuggler;
    return blah.runtime;
}
