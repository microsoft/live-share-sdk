import React from "react";
import { useFluidObjectsContext } from "../providers";
import { TurboDataObject } from "../live-share-turbo";

/**
 * Hook to gets or creates a DDS that corresponds to a given uniqueKey string.
 * @template T Type of Fluid LoadableObjectClass type to load. Must conform to IFluidLoadable interface.
 * @param uniqueKey uniqueKey value for the data object
 * @param loadableObjectClass Fluid LoadableObjectClass<T> to create/load.
 * @param onFirstInitialize Optional. Callback function for when the DDS is first loaded
 * @returns the DDS object, which is of type T when loaded and undefined while loading
 */
export function useDynamicDDS<T extends TurboDataObject = TurboDataObject<any>>(
    getDDS: () => Promise<T>,
): {
    dds: T | undefined;
} {
    /**
     * DDS IFluidLoadable
     */
    const [dds, setDDS] = React.useState<T>();
    /**
     * Import container and DDS object register callbacks from FluidContextProvider.
     */
    const {
        container,
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
        if (container?.connectionState === undefined) return;
        // Callback method to set the `initialData` into the map when the DDS is first created.
        const onGetDDS = async () => {
            try {
                const dds = await getDDS();
                setDDS(dds);
            } catch (error: any) {
                console.error(error);
            }
            container.off("connected", onGetDDS);
        };
        // Wait until connected event to ensure we have the latest document
        // and don't accidentally override a dds handle recently created
        // by another client
        if (container.connectionState === 2) {
            onGetDDS();
        } else {
            container.on("connected", onGetDDS);
        }
        return () => {
            container.off("connected", onGetDDS);
        };
    }, [container?.connectionState, getDDS]);

    return {
        dds,
    };
}
