import { DataObjectTypes } from "@fluidframework/aqueduct/legacy";
import { IFluidLoadable } from "@fluidframework/core-interfaces";
import { LiveDataObject } from "./LiveDataObject.js";
import { LiveShareRuntime } from "./LiveShareRuntime.js";
import {
    LoadableObjectCtor,
    LoadableObjectClassRecord,
    DataObjectClass,
} from "./fluid-duplicated.js";
import { ContainerSchema, SharedObjectKind } from "fluid-framework";
import {
    IFluidDataStoreChannel,
    IFluidDataStoreContext,
} from "@fluidframework/runtime-definitions/legacy";
// TODO: stabilize these APIs.
import {
    DataObjectKind,
    createDataObjectKind,
} from "@fluidframework/aqueduct/internal";
import { UnexpectedError } from "../errors.js";

/**
 * A LiveObjectClass is a class that has a factory that can create a DDS (SharedObject) and a
 * constructor that will return the type of the DataObject.
 * @typeParam T - The class of the SharedObject
 */
type LiveObjectClass<T extends IFluidLoadable> = {
    TypeName: string;
} & DataObjectClass<T> &
    LoadableObjectCtor<T>;

/**
 * Inject Live Share dependencies into your Fluid container schema.
 * This should only be done once, right before connecting to a container.
 * @remarks
 * Needed because Fluid uses static factories to construct data objects internally, and `LiveDataObject` instances require access to the `LiveShareRuntime` before use.
 * Users should not use this method if you are connecting to a container using `LiveShareClient`.
 * This is intended to be used when you are using another Fluid client, such as `AzureClient`.
 *
 * @param schema Fluid ContainerSchema you would like to inject the runtime into
 * @param liveRuntime LiveShareRuntime instance
 * @returns ContainerSchema with injected dependencies
 */
export function getLiveContainerSchema(
    schema: ContainerSchema,
    liveRuntime: LiveShareRuntime
): ContainerSchema {
    // Each container must proxy LiveDataObject classes separately.
    // This map is used to de-duplicate proxies for each class.
    const injectedClasses = new Map<string, SharedObjectKind<any>>();

    const initialObjectEntries = Object.entries(schema.initialObjects).map(
        ([key, objectClass]) => {
            return [
                key,
                getLiveDataObjectKind(
                    objectClass,
                    liveRuntime,
                    injectedClasses
                ),
            ];
        }
    );
    const newInitialObjects: LoadableObjectClassRecord =
        Object.fromEntries(initialObjectEntries);

    return {
        initialObjects: newInitialObjects,
        dynamicObjectTypes: schema.dynamicObjectTypes?.map((objectClass) =>
            getLiveDataObjectKind(objectClass, liveRuntime, injectedClasses)
        ),
    };
}

/**
 * Inject Live Share dependencies to relevant `LiveDataObject` derived classes.
 * Regular `DataObject` classes are not injected.
 *
 * @remarks
 * Can be used to follow the pattern of this package's unit tests for custom `LiveDataObject` implementations.
 *
 * @param ObjectKind a `SharedObjectKind` instance to inject with the `liveRuntime` provided, if needed.
 * @param liveRuntime the `LiveShareRuntime` instance to inject into provided `LiveDataObject` instances.
 * @param injectedClasses Optional. Map of classes that have already been injected. Default value is an empty map.
 * @returns the new `SharedObjectKind` if injected, or the same `ObjectKind` passed in if not.
 */
export function getLiveDataObjectKind<TClass extends IFluidLoadable>(
    objectClass: SharedObjectKind<any>,
    liveRuntime: LiveShareRuntime,
    injectedClasses: Map<string, SharedObjectKind<any>> = new Map()
): SharedObjectKind<TClass> {
    if (isLiveDataObject(objectClass)) {
        // We should only be proxying one Live Share DDS per type.
        // This is because Fluid attempts to de-duplicate by comparing classes, but we are dynamically creating proxies.
        // They then enforce this de-duplication using the factory type name, throwing an error in `parseDataObjectsFromSharedObjects`.
        // So, we ensure that we only create the proxy once per container.
        const typeName = (objectClass as any).TypeName;
        const CheckExisting = injectedClasses.get(typeName);
        if (CheckExisting !== undefined) {
            return CheckExisting;
        }
        // Create a new proxy for this type and insert it into proxiedClasses
        const NewProxy = getLiveDataObjectKindInternal(
            objectClass,
            liveRuntime
        ) as unknown as SharedObjectKind<TClass>;
        injectedClasses.set(typeName, NewProxy);
        return NewProxy;
    }
    return objectClass;
}

/**
 * @hidden
 */
function isLiveDataObject(value: any): value is typeof LiveDataObject {
    return value.LiveEnabled === true;
}

/**
 * @hidden
 * Create a DataObjectKind for a LiveDataObject compatible with LiveShareRuntime.
 */
function getLiveDataObjectKindInternal<I extends DataObjectTypes>(
    BaseClass: typeof LiveDataObject<I>,
    runtime: LiveShareRuntime
): DataObjectKind<LiveDataObject<I>> {
    const base = BaseClass as unknown as DataObjectKind<LiveDataObject<I>>;

    return createDataObjectKind({
        factory: {
            type: base.factory.type,
            get IFluidDataStoreFactory() {
                return this;
            },
            async instantiateDataStore(
                context: IFluidDataStoreContext,
                existing: boolean
            ): Promise<IFluidDataStoreChannel> {
                const existingRuntime =
                    LiveDataObject.__dangerousLiveRuntime.get(context);
                UnexpectedError.assert(
                    existingRuntime === undefined ||
                        existingRuntime === runtime,
                    "getLiveDataObjectKindInternal",
                    `Expected existing LiveRuntime to be undefined or the same as the provided runtime`
                );
                LiveDataObject.__dangerousLiveRuntime.set(context, runtime);
                const createdChannel = await base.factory.instantiateDataStore(
                    context,
                    existing
                );

                // Pass reference to the container runtime
                // When interactive is false, that means that this client is from the summarizer or some other system entity.
                // We only want to set the container runtime for interactive clients.
                if (context.clientDetails.capabilities.interactive === true) {
                    runtime.__dangerouslySetContainerRuntime(
                        context.containerRuntime
                    );
                }

                return createdChannel;
            },
        },
    });
}
