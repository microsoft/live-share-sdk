import { type IFluidDataStoreFactory } from "@fluidframework/runtime-definitions/internal";
import { type IChannelFactory } from "@fluidframework/datastore-definitions/internal";
import { IFluidLoadable } from "@fluidframework/core-interfaces";
import type { SharedObjectKind } from "@fluidframework/shared-object-base";
import type { ISharedObjectKind } from "@fluidframework/shared-object-base/internal";
import { type IFluidDataStoreRuntime } from "@fluidframework/datastore-definitions/internal";

/**
 * TODO: include fluid package this came from
 *
 * Utility for creating ISharedObjectKind instances.
 * @remarks
 * This takes in a class which implements IChannelFactory,
 * and uses it to return a a single value which is intended to be used as the APi entry point for the corresponding shared object type.
 * The returned value implements {@link ISharedObjectKind} for use in the encapsulated API, as well as the type erased {@link SharedObjectKind} used by the declarative API.
 * See {@link @fluidframework/fluid-static#ContainerSchema} for how this is used in the declarative API.
 * @internal
 */
export function createSharedObjectKind<TSharedObject>(
    factory: (new () => IChannelFactory<TSharedObject>) & {
        readonly Type: string;
    }
): ISharedObjectKind<TSharedObject> & SharedObjectKind<TSharedObject> {
    const result: ISharedObjectKind<TSharedObject> = {
        getFactory(): IChannelFactory<TSharedObject> {
            return new factory();
        },

        create(runtime: IFluidDataStoreRuntime, id?: string): TSharedObject {
            return runtime.createChannel(id, factory.Type) as TSharedObject;
        },
    };

    return result as typeof result & SharedObjectKind<TSharedObject>;
}

/**
 * TODO: include fluid package this came from
 * A mapping of string identifiers to instantiated `DataObject`s or `SharedObject`s.
 * @internal
 */
export type LoadableObjectRecord = Record<string, IFluidLoadable>;

/**
 * TODO: include fluid package this came from
 * A mapping of string identifiers to classes that will later be used to instantiate a corresponding `DataObject`
 * or `SharedObject`.
 */
export type LoadableObjectClassRecord = Record<string, SharedObjectKind>;

/**
 * COPIED FROM @fluidframework/fluid-static
 *
 * A class that has a factory that can create a `DataObject` and a
 * constructor that will return the type of the `DataObject`.
 *
 * @typeParam T - The class of the `DataObject`.
 * @privateRemarks
 * Having both `factory` and constructor is redundant.
 * TODO: It appears the factory is what's used, so the constructor should be removed once factory provides strong typing.
 */
export interface DataObjectClass<T extends IFluidLoadable> {
    readonly factory: IFluidDataStoreFactory;
    new (...args: any[]): T;
}

/**
 * COPIED FROM @fluidframework/fluid-static
 *
 * An internal type used by the internal type guard isDataObjectClass to cast a
 * DataObjectClass to a type that is strongly coupled to IFluidDataStoreFactory.
 * Unlike the external and exported type DataObjectClass  which is
 * weakly coupled to the IFluidDataStoreFactory to prevent leaking internals.
 */
type InternalDataObjectClass<T extends IFluidLoadable> = DataObjectClass<T> &
    Record<"factory", IFluidDataStoreFactory>;

/**
 * COPIED FROM @fluidframework/fluid-static
 *
 * Runtime check to determine if a class is a DataObject type
 */
const isDataObjectClass = (
    obj: unknown
): obj is InternalDataObjectClass<IFluidLoadable> => {
    const maybe = obj as
        | Partial<InternalDataObjectClass<IFluidLoadable>>
        | undefined;
    return (
        maybe?.factory?.IFluidDataStoreFactory !== undefined &&
        maybe?.factory?.IFluidDataStoreFactory === maybe?.factory
    );
};

/**
 * COPIED FROM @fluidframework/fluid-static
 *
 * Runtime check to determine if a class is a SharedObject type
 */
const isSharedObjectClass = (
    obj: unknown
): obj is SharedObjectClass<IFluidLoadable> => {
    const maybe = obj as Partial<SharedObjectClass<IFluidLoadable>> | undefined;
    return maybe?.getFactory !== undefined;
};

/**
 * COPIED FROM @fluidframework/fluid-static
 *
 * A class that has a factory that can create a DDSes (`SharedObject`s) and a
 * constructor that will return the type of the `DataObject`.
 *
 * @typeParam T - The class of the `SharedObject`.
 * @public
 */
type SharedObjectClass<T extends IFluidLoadable> = {
    readonly getFactory: () => IChannelFactory;
} & LoadableObjectCtor<T>;

/**
 * COPIED FROM @fluidframework/fluid-static
 *
 * An object with a constructor that will return an {@link @fluidframework/core-interfaces#IFluidLoadable}.
 *
 * @typeParam T - The class of the loadable object.
 * @public
 */
export type LoadableObjectCtor<T extends IFluidLoadable> = new (
    ...args: any[]
) => T;

/**
 * Combining above to get factory type string.
 */
export const getFactoryName = (obj: unknown): string | undefined => {
    if (isDataObjectClass(obj)) {
        return obj.factory.type;
    } else if (isSharedObjectClass(obj)) {
        return obj.getFactory().type;
    } else {
        return undefined;
    }
};
