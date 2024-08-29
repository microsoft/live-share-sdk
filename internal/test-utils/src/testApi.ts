/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

// Loader API
import { Loader } from "@fluidframework/container-loader/internal";

// ContainerRuntime API
import { ContainerRuntime } from "@fluidframework/container-runtime/internal";

// Data Runtime API
import * as agentScheduler from "@fluidframework/agent-scheduler";
import * as cell from "@fluidframework/cell";
import { SharedCell } from "@fluidframework/cell/internal";
import * as counter from "@fluidframework/counter";
import { SharedCounter } from "@fluidframework/counter/internal";
import * as map from "@fluidframework/map";
import { SharedDirectory, SharedMap } from "@fluidframework/map/internal";
import * as matrix from "@fluidframework/matrix";
import { SharedMatrix } from "@fluidframework/matrix/internal";
import * as orderedCollection from "@fluidframework/ordered-collection";
import { ConsensusQueue } from "@fluidframework/ordered-collection/internal";
import * as registerCollection from "@fluidframework/register-collection";
import { ConsensusRegisterCollection } from "@fluidframework/register-collection/internal";
import * as sequence from "@fluidframework/sequence";
import { SharedString } from "@fluidframework/sequence/internal";
import { TestFluidObjectFactory } from "@fluidframework/test-utils/internal";

// ContainerRuntime and Data Runtime API
import {
    ContainerRuntimeFactoryWithDefaultDataStore,
    DataObject,
    DataObjectFactory,
} from "@fluidframework/aqueduct/internal";
import * as sequenceDeprecated from "@fluid-experimental/sequence-deprecated";

// #region Current versions of the APIs.

/**
 * @internal
 */
export const LoaderApi = {
    version: "",
    Loader,
};

/**
 * @internal
 */
export const ContainerRuntimeApi = {
    version: "",
    ContainerRuntime,
    ContainerRuntimeFactoryWithDefaultDataStore,
};

/**
 * @internal
 */
export const DataRuntimeApi = {
    version: "",
    DataObject,
    DataObjectFactory,
    TestFluidObjectFactory,
    dds: {
        SharedCell,
        SharedCounter,
        SharedDirectory,
        SharedMap,
        SharedMatrix,
        ConsensusQueue,
        ConsensusRegisterCollection,
        SharedString,
    },
    /**
     * Contains all APIs from imported DDS packages.
     * Keep in mind that regardless of the DataRuntime version,
     * the APIs will be typechecked as if they were from the latest version.
     *
     * @remarks - Using these APIs in an e2e test puts additional burden on the test author and anyone making
     * changes to those APIs in the future, since this will necessitate back-compat logic in the tests.
     * Using non-stable APIs in e2e tests for that reason is discouraged.
     */
    packages: {
        cell,
        counter,
        map,
        matrix,
        orderedCollection,
        registerCollection,
        sequence,
        sequenceDeprecated,
        agentScheduler,
    },
};
