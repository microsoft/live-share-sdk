import {
    DataObjectTypes,
    IDataObjectProps,
    PureDataObjectFactory,
} from "@fluidframework/aqueduct";
import { LiveDataObject } from "./LiveDataObject";
import { LiveShareRuntime } from "./LiveDataObjectRuntime";
import {
    ContainerSchema,
    LoadableObjectClass,
    LoadableObjectClassRecord,
} from "fluid-framework";

/**
 * @hidden
 */
interface ConstructorWithFactory<
    T extends LiveDataObject<I>,
    I extends DataObjectTypes = DataObjectTypes
> {
    new (props: IDataObjectProps<I>): T;
    factory: PureDataObjectFactory<T, I>;
}

/**
 * @hidden
 * Create a new class extending LiveDataObject to inject in _liveRuntime
 */
function proxyLiveDataObjectClass<
    T extends LiveDataObject<I>,
    I extends DataObjectTypes = DataObjectTypes
>(
    BaseClass: new (props: IDataObjectProps<I>) => T,
    runtime: LiveShareRuntime
): ConstructorWithFactory<T, I> {
    class ProxiedBaseClass extends (BaseClass as new (
        props: IDataObjectProps<I>
    ) => LiveDataObject<I>) {
        constructor(props: IDataObjectProps<I>) {
            super(props);
            this["_liveRuntime"] = runtime;
        }
    }

    const FinalClass = class extends BaseClass {
        public static readonly factory = new Proxy((BaseClass as any).factory, {
            get: function (target, prop, receiver) {
                if (prop === "ctor") {
                    return ProxiedBaseClass;
                }
                return Reflect.get(target, prop, receiver);
            },
        });
    };

    return FinalClass;
}

/**
 * Inject Live Share dependencies into your Fluid container schema.
 * @remarks
 * Users should not use this method unless you are connecting to a container using `LiveShareClient`.
 * This is intended to be used when you are using another Fluid client, such as `AzureClient`.
 *
 * @param schema Fluid ContainerSchema you would like to inject the runtime into
 * @param liveRuntime LiveDataObjectRuntime instance
 * @returns ContainerSchema with injected dependencies
 */
export function getLiveShareContainerSchemaProxy(
    schema: ContainerSchema,
    liveRuntime: LiveShareRuntime
): ContainerSchema {
    const initialObjectEntries = Object.entries(schema.initialObjects).map(
        ([key, ObjectClass]) => {
            return [
                key,
                getLiveDataObjectClassProxy(ObjectClass, liveRuntime),
            ];
        }
    );
    const newInitialObjects: LoadableObjectClassRecord =
        Object.fromEntries(initialObjectEntries);

    return {
        initialObjects: newInitialObjects,
        dynamicObjectTypes: schema.dynamicObjectTypes?.map((ObjectClass) =>
            getLiveDataObjectClassProxy(ObjectClass, liveRuntime)
        ),
    };
}

/**
 * @hidden
 * Inject Live Share dependencies to relevant `LiveDataObject` derived classes.
 * Regular `DataObject` classes are not proxied.
 * @remarks
 * Exported publicly for use in Live Share Turbo
 */
export function getLiveDataObjectClassProxy(
    ObjectClass: LoadableObjectClass<any>,
    liveRuntime: LiveShareRuntime
): LoadableObjectClass<any> {
    return isLiveDataObject(ObjectClass)
        ? proxyLiveDataObjectClass(ObjectClass, liveRuntime)
        : ObjectClass;
}

/**
 * @hidden
 */
function isLiveDataObject(value: any): value is LiveDataObject {
    return value.LiveEnabled === true;
}
