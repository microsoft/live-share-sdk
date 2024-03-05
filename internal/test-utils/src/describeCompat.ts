/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { createChildLogger } from "@fluidframework/telemetry-utils";
import {
    getUnexpectedLogErrorException,
    ITestObjectProvider,
} from "@fluidframework/test-utils";
import {
    CompatApis,
    getVersionedTestObjectProviderFromApis,
} from "./compatUtils";
import { ContainerRuntimeApi, DataRuntimeApi, LoaderApi } from "./testApi";
import { LocalDriverApi } from "./localDriverApi";

/*
 * Mocha Utils for test to generate the compat variants.
 */
function createCompatSuite(
    tests: (
        this: Mocha.Suite,
        provider: (options?: ITestObjectProviderOptions) => ITestObjectProvider,
        apis: CompatApis
    ) => void
): (this: Mocha.Suite) => void {
    return function (this: Mocha.Suite) {
        describe(`Fluid Test: ${this.title}`, () => {
            let provider: ITestObjectProvider;
            let resetAfterEach: boolean;
            const apis: CompatApis = getVersionedApis();

            before(async function () {
                try {
                    provider =
                        await getVersionedTestObjectProviderFromApis(apis);
                } catch (error) {
                    const logger = createChildLogger({
                        logger: getTestLogger?.(),
                        namespace: "DescribeCompatSetup",
                    });
                    logger.sendErrorEvent(
                        {
                            eventName: "TestObjectProviderLoadFailed",
                            driverType: "local",
                        },
                        error
                    );
                    throw error;
                }

                Object.defineProperty(this, "__fluidTestProvider", {
                    get: () => provider,
                });
            });

            tests.bind(this)((options?: ITestObjectProviderOptions) => {
                resetAfterEach = options?.resetAfterEach ?? true;
                if (options?.syncSummarizer === true) {
                    provider.resetLoaderContainerTracker(
                        true /* syncSummarizerClients */
                    );
                }
                return provider;
            }, apis);

            afterEach(function (this: Mocha.Context, done: Mocha.Done) {
                const logErrors = getUnexpectedLogErrorException(
                    provider.logger
                );
                // if the test failed for another reason
                // then we don't need to check errors
                // and fail the after each as well
                if (this.currentTest?.state === "passed") {
                    done(logErrors);
                } else {
                    done();
                }
                if (resetAfterEach) {
                    provider.reset();
                }
            });
        });
    };
}

/**
 * Get versioned APIs for the given config.
 */
function getVersionedApis(): CompatApis {
    return {
        containerRuntime: ContainerRuntimeApi,
        dataRuntime: DataRuntimeApi,
        dds: DataRuntimeApi.dds,
        driver: LocalDriverApi,
        loader: LoaderApi,
    };
}

/**
 * @internal
 */
export interface ITestObjectProviderOptions {
    /** If true, resets all state after each test completes. */
    resetAfterEach?: boolean;
    /** If true, synchronizes summarizer client as well when ensureSynchronized() is called. */
    syncSummarizer?: boolean;
}

/**
 * @internal
 */
export type DescribeCompatSuite = (
    name: string,
    tests: (
        this: Mocha.Suite,
        provider: (options?: ITestObjectProviderOptions) => ITestObjectProvider,
        apis: CompatApis
    ) => void
) => Mocha.Suite | void;

/**
 * @internal
 */
export type DescribeCompat = DescribeCompatSuite & {
    /**
     * Like Mocha's `describe.skip`, but for compat tests.
     */
    skip: DescribeCompatSuite;

    /**
     * Like Mocha's `describe.only`, but for compat tests.
     */
    only: DescribeCompatSuite;

    /**
     * Run the test suite ignoring the compatibility matrix. In other words, all Fluid layers will
     * reference the current code version.
     *
     * This is meant as a debug utility for e2e tests: do not check in tests that use it as they won't have any
     * compat coverage (attempting to do so will fail the PR gate anyway).
     */
    noCompat: DescribeCompatSuite;
};

function createCompatDescribe(): DescribeCompat {
    const createCompatSuiteWithDefault = (
        tests: (
            this: Mocha.Suite,
            provider: () => ITestObjectProvider,
            apis: CompatApis
        ) => void
    ) => {
        return createCompatSuite(tests);
    };
    const d: DescribeCompat = (name: string, tests) =>
        describe(name, createCompatSuiteWithDefault(tests));
    d.skip = (name, tests) =>
        describe.skip(name, createCompatSuiteWithDefault(tests));

    d.only = (name, tests) =>
        describe.only(name, createCompatSuiteWithDefault(tests));

    d.noCompat = (name, tests) =>
        describe(name, createCompatSuiteWithDefault(tests));

    return d;
}

/**
 * `describeCompat` expects 3 arguments (name: string, compatVersion: string, tests).
 * There are three compatVersion options to generate different combinations, depending of the need of the tests:
 * `FullCompat`: generate test variants with compat combinations that varies the version for all layers.
 * `LoaderCompat`: generate test variants with compat combinations that only varies the loader version.
 * Specific version (String) : specify a minimum compat version (e.g. "2.0.0-rc.1.0.0") which will be the minimum version a
 * test suite will test against. This should be equal to the value of pkgVersion at the time you're writing the new test suite.
 *
 * @internal
 */
export const describeCompat: DescribeCompat = createCompatDescribe();
