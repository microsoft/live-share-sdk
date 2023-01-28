import { IValueChanged, SharedMap } from "fluid-framework";
import React from "react";
import {
  DeleteSharedStateAction,
  IAzureContainerResults,
  RegisterSharedSetStateAction,
  SetLocalStateAction,
  UnregisterSharedSetStateAction,
  UpdateSharedStateAction,
} from "../types";

export interface ISharedStateRegistryResponse {
  registerSharedSetStateAction: RegisterSharedSetStateAction;
  unregisterSharedSetStateAction: UnregisterSharedSetStateAction;
  updateSharedState: UpdateSharedStateAction;
  deleteSharedState: DeleteSharedStateAction;
}

/**
 * Hook used internally to keep track of the SharedSetStateActionMap for each unique key. It sets state values for provided keys and updates components listening to the values.
 * 
 * @param results IAzureContainerResults response or undefined
 * @returns ISharedStateRegistryResponse object
 */
export const useSharedStateRegistry = (
  results: IAzureContainerResults | undefined
): ISharedStateRegistryResponse => {
  const registeredSharedSetStateActionMapRef = React.useRef<
    Map<string, Map<string, SetLocalStateAction>>
  >(new Map());

  const registerSharedSetStateAction = React.useCallback(
    (
      uniqueKey: string,
      componentId: string,
      setLocalStateAction: SetLocalStateAction
    ) => {
      let actionsMap =
        registeredSharedSetStateActionMapRef.current.get(uniqueKey);
      if (actionsMap) {
        if (!actionsMap.has(componentId)) {
          actionsMap.set(componentId, setLocalStateAction);
        }
      } else {
        actionsMap = new Map<string, SetLocalStateAction>();
        actionsMap.set(componentId, setLocalStateAction);
        registeredSharedSetStateActionMapRef.current.set(uniqueKey, actionsMap);
      }
      // Set initial values, if known
      const stateMap = results?.container.initialObjects.stateMap as
        | SharedMap
        | undefined;
      const initialValue = stateMap?.get(uniqueKey);
      if (initialValue) {
        setLocalStateAction(initialValue);
      }
    },
    [results]
  );

  const unregisterSharedSetStateAction = React.useCallback(
    (uniqueKey: string, componentId: string) => {
      let actionsMap =
        registeredSharedSetStateActionMapRef.current.get(uniqueKey);
      if (actionsMap?.has(componentId)) {
        actionsMap.delete(componentId);
      }
    },
    []
  );

  const updateSharedState: UpdateSharedStateAction = React.useCallback(
    (uniqueKey: string, value: any) => {
      if (!results) return;
      const { container } = results;
      const stateMap = container.initialObjects.stateMap as SharedMap;
      stateMap.set(uniqueKey, value);
    },
    [results]
  );

  const disposeSharedState: DeleteSharedStateAction = React.useCallback(
    (uniqueKey: string) => {
      if (!results) return;
      const { container } = results;
      let actionsMap =
        registeredSharedSetStateActionMapRef.current.get(uniqueKey);
      actionsMap?.clear();
      const stateMap = container.initialObjects.stateMap as SharedMap;
      stateMap.delete(uniqueKey);
    },
    [results]
  );

  React.useEffect(() => {
    if (!results) return;
    const { container } = results;
    const stateMap = container.initialObjects.stateMap as SharedMap;
    const valueChangedListener = (changed: IValueChanged): void => {
      if (registeredSharedSetStateActionMapRef.current.has(changed.key)) {
        const value = stateMap.get(changed.key);
        const actionMap = registeredSharedSetStateActionMapRef.current.get(
          changed.key
        );
        actionMap?.forEach((setLocalStateHandler) => {
          setLocalStateHandler(value);
        });
      }
    };
    stateMap.on("valueChanged", valueChangedListener);
    // Set initial values
    stateMap.forEach((value: any, key: string) => {
      const actionMap = registeredSharedSetStateActionMapRef.current.get(key);
      actionMap?.forEach((setLocalStateHandler) => {
        setLocalStateHandler(value);
      });
    });
    return () => {
      stateMap.off("valueChanged", valueChangedListener);
    };
  }, [results]);

  return {
    registerSharedSetStateAction,
    unregisterSharedSetStateAction,
    updateSharedState,
    deleteSharedState: disposeSharedState,
  };
};
