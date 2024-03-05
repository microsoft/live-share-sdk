/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    IFluidLoadable,
} from "@fluidframework/core-interfaces";
import {
    IFluidDataStoreContext,
    IFluidDataStoreFactory,
} from "@fluidframework/runtime-definitions";
import {
    IFluidDataStoreRuntime,
    IChannelFactory,
} from "@fluidframework/datastore-definitions";
import { ISharedDirectory } from "@fluidframework/map";
import { unreachableCase } from "@fluidframework/core-utils";
import {
    ITestContainerConfig,
    DataObjectFactoryType,
    ChannelFactoryRegistry,
    createTestContainerRuntimeFactory,
    TestObjectProvider,
} from "@fluidframework/test-utils";
import { mixinAttributor } from "@fluid-experimental/attributor";
import { ContainerRuntimeApi, DataRuntimeApi, LoaderApi } from "./testApi";
import { LocalServerTestDriver } from "./localServerTestDriver";
import { LocalDriverApi } from "./localDriverApi";

/**
 * @internal
 */
export const TestDataObjectType = "@fluid-example/test-dataStore";

/**
 * @internal
 */
export interface ITestDataObject extends IFluidLoadable {
    _context: IFluidDataStoreContext;
    _runtime: IFluidDataStoreRuntime;
    _root: ISharedDirectory;
}

function createGetDataStoreFactoryFunction(api: typeof DataRuntimeApi) {
    class TestDataObject extends api.DataObject implements ITestDataObject {
        public get _context() {
            return this.context;
        }
        public get _runtime() {
            return this.runtime;
        }
        public get _root() {
            return this.root;
        }
    }

    const registryMapping: { [index: string]: any } = {};
    for (const value of Object.values(api.dds)) {
        registryMapping[value.getFactory().type] = value.getFactory();
    }

    function convertRegistry(
        registry: ChannelFactoryRegistry = []
    ): ChannelFactoryRegistry {
        const oldRegistry: [string | undefined, IChannelFactory][] = [];
        for (const [key, factory] of registry) {
            const oldFactory = registryMapping[factory.type];
            if (oldFactory === undefined) {
                throw Error(
                    `Invalid or unimplemented channel factory: ${factory.type}`
                );
            }
            oldRegistry.push([key, oldFactory]);
        }

        return oldRegistry;
    }

    return function (
        containerOptions?: ITestContainerConfig
    ): IFluidDataStoreFactory {
        const registry = convertRegistry(containerOptions?.registry);
        const fluidDataObjectType = containerOptions?.fluidDataObjectType;
        switch (fluidDataObjectType) {
            case undefined:
            case DataObjectFactoryType.Primed:
                return new api.DataObjectFactory(
                    TestDataObjectType,
                    TestDataObject,
                    [...registry].map((r) => r[1]),
                    {}
                );
            case DataObjectFactoryType.Test:
                return new api.TestFluidObjectFactory(registry);
            default:
                unreachableCase(
                    fluidDataObjectType,
                    `Unknown data store factory type ${fluidDataObjectType}`
                );
        }
    };
}

// Only support current version, not baseVersion support
/**
 * @internal
 */
export const getDataStoreFactory =
    createGetDataStoreFactoryFunction(DataRuntimeApi);

/**
 * @internal
 */
export async function getVersionedTestObjectProviderFromApis(
    apis: Omit<CompatApis, "dds">,
) {
    const driver = new LocalServerTestDriver(LocalDriverApi);

    const getDataStoreFactoryFn = createGetDataStoreFactoryFunction(
        apis.dataRuntime
    );
    const containerFactoryFn = (containerOptions?: ITestContainerConfig) => {
        const dataStoreFactory = getDataStoreFactoryFn(containerOptions);
        const runtimeCtor =
            containerOptions?.enableAttribution === true
                ? mixinAttributor(apis.containerRuntime.ContainerRuntime)
                : apis.containerRuntime.ContainerRuntime;
        const factoryCtor = createTestContainerRuntimeFactory(runtimeCtor);
        return new factoryCtor(
            TestDataObjectType,
            dataStoreFactory,
            containerOptions?.runtimeOptions
        );
    };

    return new TestObjectProvider(
        apis.loader.Loader,
        driver,
        containerFactoryFn
    );
}

export interface CompatApis {
    containerRuntime: typeof ContainerRuntimeApi;
    dataRuntime: typeof DataRuntimeApi;
    dds: (typeof DataRuntimeApi)["dds"];
    driver: typeof LocalDriverApi;
    loader: typeof LoaderApi;
}
