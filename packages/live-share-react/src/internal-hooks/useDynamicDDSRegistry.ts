import { IValueChanged, SharedMap } from "fluid-framework";
import {
    IFluidHandle,
    FluidObject,
    IFluidLoadable,
} from "@fluidframework/core-interfaces";
import { LoadableObjectClass } from "@fluidframework/fluid-static";
import { useCallback, useEffect, useRef } from "react";
import {
    IAzureContainerResults,
    RegisterDDSSetStateAction,
    SetLocalStateAction,
    UnregisterDDSSetStateAction,
} from "../types";

export interface IDynamicDDSRegistry {
    registerDDSSetStateAction: RegisterDDSSetStateAction;
    unregisterDDSSetStateAction: UnregisterDDSSetStateAction;
}

export const useDynamicDDSRegistry = (
    results: IAzureContainerResults | undefined
): IDynamicDDSRegistry => {
    const registeredDDSSetStateActionMapRef = useRef<
        Map<string, Map<string, SetLocalStateAction>>
    >(new Map());

    // Get the DDS from dynamicObjects for a given key, if known
    const getDDS = useCallback(
        async <T extends IFluidLoadable>(
            key: string
        ): Promise<T | undefined> => {
            const dynamicObjectMap = results?.container.initialObjects
                .dynamicObjects as SharedMap | undefined;
            if (dynamicObjectMap) {
                const handleValue = dynamicObjectMap.get<
                    IFluidHandle<T> & IFluidLoadable
                >(key);
                if (handleValue) {
                    const dds = await handleValue.get();
                    return dds;
                } else {
                    return undefined;
                }
            } else {
                throw new Error(
                    "getDDS should never be called if dynamicObjects is undefined"
                );
            }
        },
        [results]
    );

    // Create a new DDS of type T in dynamicObjects
    const createDDS = useCallback(
        async <T extends IFluidLoadable>(
            key: string,
            objectClass: LoadableObjectClass<T>
        ): Promise<T> => {
            const dynamicObjectMap = results?.container.initialObjects
                .dynamicObjects as SharedMap | undefined;
            if (dynamicObjectMap) {
                // Create a new DDS and set the handle to the DDS
                const dds = await results!.container.create<T>(objectClass);
                dynamicObjectMap.set(key, dds.handle);
                return dds;
            } else {
                throw new Error(
                    "createDDS: should never be called if dynamicObjectsMap is undefined"
                );
            }
        },
        [results]
    );

    // Callback for hooks (e.g., useSharedMap) to register a new set state action so they
    // always have the most recent DDS. If one does not exist, we create it here.
    const registerDDSSetStateAction: RegisterDDSSetStateAction =
        useCallback<RegisterDDSSetStateAction>(
            async <T extends IFluidLoadable>(
                uniqueKey: string,
                componentId: string,
                objectClass: LoadableObjectClass<T>,
                setLocalStateAction: SetLocalStateAction,
                onDidFirstInitialize?: (dds: T) => void
            ) => {
                let shouldCreateIfNeeded = false;
                let actionsMap =
                    registeredDDSSetStateActionMapRef.current.get(uniqueKey);
                if (actionsMap) {
                    if (!actionsMap.has(componentId)) {
                        shouldCreateIfNeeded = true;
                        actionsMap.set(componentId, setLocalStateAction);
                    }
                } else {
                    shouldCreateIfNeeded = true;
                    actionsMap = new Map<string, SetLocalStateAction>();
                    actionsMap.set(componentId, setLocalStateAction);
                    registeredDDSSetStateActionMapRef.current.set(
                        uniqueKey,
                        actionsMap
                    );
                }
                try {
                    // Set initial values, if known
                    let dds = await getDDS<T>(uniqueKey);
                    if (dds) {
                        setLocalStateAction(dds);
                    } else if (shouldCreateIfNeeded) {
                        // Create a new DDS of type T
                        dds = await createDDS<T>(uniqueKey, objectClass);
                        setLocalStateAction(dds);
                        onDidFirstInitialize?.(dds);
                    }
                } catch (error) {
                    throw error;
                }
            },
            [results]
        );

    // Callback for hooks (e.g., useSharedMap) to unregister their set state actions
    const unregisterDDSSetStateAction: UnregisterDDSSetStateAction =
        useCallback((uniqueKey: string, componentId: string) => {
            let actionsMap =
                registeredDDSSetStateActionMapRef.current.get(uniqueKey);
            if (actionsMap?.has(componentId)) {
                actionsMap.delete(componentId);
            }
        }, []);

    // Initial setup
    useEffect(() => {
        if (!results) return;
        const { container } = results;
        const dynamicObjectMap = container.initialObjects
            .dynamicObjects as SharedMap;
        // Register value changed listener
        const valueChangedListener = (
            changed: IValueChanged,
            local: boolean
        ): void => {
            if (local) return;
            console.log("dds value changed");
            if (registeredDDSSetStateActionMapRef.current.has(changed.key)) {
                const actionMap = registeredDDSSetStateActionMapRef.current.get(
                    changed.key
                );
                // Get the DDS for the changed value, if known
                getDDS<any>(changed.key)
                    .then((dds) => {
                        // Update each component that has registered an action in actionMap
                        actionMap?.forEach((setLocalStateHandler) => {
                            setLocalStateHandler(dds);
                        });
                    })
                    .catch((error) => console.error(error));
            }
        };
        console.log("dds listening for changes");
        dynamicObjectMap.on("valueChanged", valueChangedListener);
        // Set initial values
        dynamicObjectMap.forEach(
            (
                handleValue: IFluidHandle<FluidObject<any> & IFluidLoadable>,
                key: string
            ) => {
                const actionMap =
                    registeredDDSSetStateActionMapRef.current.get(key);
                if (handleValue) {
                    handleValue
                        .get()
                        .then((dds) => {
                            // Update each component that has registered an action in actionMap
                            actionMap?.forEach((setLocalStateHandler) => {
                                setLocalStateHandler(dds);
                            });
                        })
                        .catch((error) => {
                            console.error(error);
                        });
                }
            }
        );
        return () => {
            console.log("dds not listening for changes");
            dynamicObjectMap.off("valueChanged", valueChangedListener);
        };
    }, [results]);

    return {
        registerDDSSetStateAction,
        unregisterDDSSetStateAction,
    };
};
