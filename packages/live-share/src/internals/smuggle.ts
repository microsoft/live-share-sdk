import { DataObject } from "@fluidframework/aqueduct/internal";
import { type ISharedDirectory } from "@fluidframework/map/internal";
import { type IFluidDataStoreRuntime } from "@fluidframework/datastore-definitions";
import { IFluidContainer } from "@fluidframework/fluid-static";

export function getContainerEntryPoint(container: IFluidContainer): DataObject {
    interface RootDataObjectSmuggler {
        rootDataObject: DataObject;
    }
    const blah = container as unknown as RootDataObjectSmuggler;
    return blah.rootDataObject;
}

export function getRootDirectory(rootDataObject: DataObject): ISharedDirectory {
    interface RootDataObjectDirectorymuggler {
        root: ISharedDirectory;
    }
    const blah = rootDataObject as unknown as RootDataObjectDirectorymuggler;
    return blah.root;
}

export function getContainerRuntime(
    rootDataObject: DataObject
): IFluidDataStoreRuntime {
    interface RootDataObjectRuntimeSmuggler {
        runtime: IFluidDataStoreRuntime;
    }
    const blah = rootDataObject as unknown as RootDataObjectRuntimeSmuggler;
    return blah.runtime;
}
