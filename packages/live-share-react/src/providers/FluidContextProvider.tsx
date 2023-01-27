import { IFluidContainer, LoadableObjectClass } from "fluid-framework";
import React from "react";
import {
  AzureClient,
  AzureClientProps,
  AzureContainerServices,
} from "@fluidframework/azure-client";
import { IAzureContainerResults } from "../types";
import {
  IDynamicDDSRegistry,
  ISharedStateRegistryResponse,
  useDynamicDDSRegistry,
  useSharedStateRegistry,
} from "../internal-hooks";
import { getContainerSchema } from "../utils";

interface IFluidContext
  extends ISharedStateRegistryResponse,
    IDynamicDDSRegistry {
  container: IFluidContainer | undefined;
  services: AzureContainerServices | undefined;
  joinError: Error | undefined;
  getContainer: (containerId: string) => Promise<IAzureContainerResults>;
  createContainer: (
    onInitializeContainer?: (container: IFluidContainer) => void
  ) => Promise<IAzureContainerResults>;
}

export const FluidContext = React.createContext<IFluidContext>(
  {} as IFluidContext
);

export const useFluidObjectsContext = (): IFluidContext => {
  const context = React.useContext(FluidContext);
  return context;
};

interface IFluidContextProviderProps {
  clientOptions: AzureClientProps;
  containerId?: string;
  createOnLoad?: boolean;
  joinOnLoad?: boolean;
  additionalDynamicObjectTypes?: LoadableObjectClass<any>[];
  children?: React.ReactNode;
}

export const FluidContextProvider: React.FC<IFluidContextProviderProps> = (
  props
) => {
  const startedRef = React.useRef(false);
  const clientRef = React.useRef(new AzureClient(props.clientOptions));
  const [results, setResults] = React.useState<
    IAzureContainerResults | undefined
  >();
  const [joinError, setJoinError] = React.useState<Error | undefined>();

  const stateRegistryCallbacks = useSharedStateRegistry(results);
  const ddsRegistryCallbacks = useDynamicDDSRegistry(results);

  const getContainer = React.useCallback(
    async (containerId: string): Promise<IAzureContainerResults> => {
      return new Promise(async (resolve, reject) => {
        try {
          console.log(containerId);
          const results: IAzureContainerResults =
            await clientRef.current.getContainer(
              containerId,
              getContainerSchema(props.additionalDynamicObjectTypes)
            );
          setResults(results);
          resolve(results);
        } catch (error: any) {
          if (error instanceof Error) {
            setJoinError(error);
          }
          reject(error);
        }
      });
    },
    [props.containerId, props.additionalDynamicObjectTypes, setResults]
  );

  const createContainer = React.useCallback(
    async (
      onInitializeContainer?: (container: IFluidContainer) => void
    ): Promise<IAzureContainerResults> => {
      return new Promise(async (resolve, reject) => {
        try {
          const results: IAzureContainerResults =
            await clientRef.current.createContainer(
              getContainerSchema(props.additionalDynamicObjectTypes)
            );
          if (onInitializeContainer) {
            onInitializeContainer(results.container);
          }
          const containerId = await results.container.attach();
          window.location.hash = containerId;
          setResults(results);
          resolve(results);
        } catch (error: any) {
          if (error instanceof Error) {
            setJoinError(error);
          }
          reject(error);
        }
      });
    },
    [props.containerId, setResults]
  );

  React.useEffect(() => {
    if (results || startedRef.current) return;
    startedRef.current = true;
    if (props.containerId && props.joinOnLoad) {
      getContainer(props.containerId);
    } else if (!props.containerId && props.createOnLoad) {
      createContainer();
    }
  }, [
    results,
    props.containerId,
    props.createOnLoad,
    props.joinOnLoad,
    getContainer,
    createContainer,
  ]);

  return (
    <FluidContext.Provider
      value={{
        container: results?.container,
        services: results?.services,
        joinError,
        createContainer,
        getContainer,
        ...stateRegistryCallbacks,
        ...ddsRegistryCallbacks,
      }}
    >
      {props.children}
    </FluidContext.Provider>
  );
};
