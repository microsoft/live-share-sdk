import { LoadableObjectClass } from "fluid-framework";
import { IFluidLoadable } from "@fluidframework/core-interfaces";
import React from "react";
import { v4 as uuid } from "uuid";
import { useFluidObjectsContext } from "../providers";

/**
 * Hook to gets or creates a DDS that corresponds to a given uniqueKey string.
 * @template T Type of Fluid LoadableObjectClass type to load. Must conform to IFluidLoadable interface.
 * @param uniqueKey uniqueKey value for the data object
 * @param loadableObjectClass Fluid LoadableObjectClass<T> to create/load.
 * @param onFirstInitialize Optional. Callback function for when the DDS is first loaded
 * @returns the DDS object, which is of type T when loaded and undefined while loading
 */
export function useDynamicDDS<T extends IFluidLoadable>(
    uniqueKey: string,
    loadableObjectClass: LoadableObjectClass<T>,
    onFirstInitialize?: (dds: T) => void
): {
    dds: T | undefined;
} {
    /**
     * Unique ID reference for the component.
     */
    const componentIdRef = React.useRef(uuid());
    /**
     * DDS IFluidLoadable
     */
    const [dds, setDDS] = React.useState<T>();
    /**
     * Import container and DDS object register callbacks from FluidContextProvider.
     */
    const {
        container,
        registerDDSSetStateAction,
        unregisterDDSSetStateAction,
    } = useFluidObjectsContext();

    /**
     * Once container is available, this effect will register the setter method so that the DDS loaded
     * from `dynamicObjects` that matches `uniqueKey` can be passed back to this hook. If one does not yet exist,
     * a new DDS is automatically created. If multiple users try to create a `EphemeralEvent` at the same
     * time when this component first mounts, `registerDDSSetStateAction` ensures that the hook will ultimately
     * self correct.
     *
     * @see registerDDSSetStateAction to see how DDS handles are attached/created for the DDS.
     * @see unregisterDDSSetStateAction to see how this component stops listening to changes in the DDS handles on unmount.
     */
    React.useEffect(() => {
        if (!container) return;
        // Callback method to set the `initialData` into the map when the DDS is first created.
        const registerDDS = () => {
            registerDDSSetStateAction(
                uniqueKey,
                componentIdRef.current,
                loadableObjectClass,
                setDDS,
                onFirstInitialize
            );
            container.off("connected", registerDDS);
        };
        // Wait until connected event to ensure we have the latest document
        // and don't accidentally override a dds handle recently created
        // by another client
        if (container.connectionState === 2) {
            registerDDS();
        } else {
            container.on("connected", registerDDS);
        }
        return () => {
            // On unmount, unregister set state action and container connected listener
            unregisterDDSSetStateAction(uniqueKey, componentIdRef.current);
            container.off("connected", registerDDS);
        };
    }, [container]);

    return {
        dds,
    };
}
