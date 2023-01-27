import { IValueChanged, SharedMap } from "fluid-framework";
import { useCallback, useEffect, useRef } from "react";
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

export const useSharedStateRegistry = (
  results: IAzureContainerResults | undefined
): ISharedStateRegistryResponse => {
  const registeredSharedSetStateActionMapRef = useRef<
    Map<string, Map<string, SetLocalStateAction>>
  >(new Map());

  const registerSharedSetStateAction = useCallback(
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

  const unregisterSharedSetStateAction = useCallback(
    (uniqueKey: string, componentId: string) => {
      let actionsMap =
        registeredSharedSetStateActionMapRef.current.get(uniqueKey);
      if (actionsMap?.has(componentId)) {
        actionsMap.delete(componentId);
      }
    },
    []
  );

  const updateSharedState: UpdateSharedStateAction = useCallback(
    (uniqueKey: string, value: any) => {
      if (!results) return;
      const { container } = results;
      const stateMap = container.initialObjects.stateMap as SharedMap;
      stateMap.set(uniqueKey, value);
    },
    [results]
  );

  const disposeSharedState: DeleteSharedStateAction = useCallback(
    (uniqueKey: string) => {
      if (!results) return;
      const { container } = results;
      let actionsMap =
        registeredSharedSetStateActionMapRef.current.get(uniqueKey);
      actionsMap?.clear();
      const stateMap = container.initialObjects.stateMap as SharedMap;
      stateMap.delete(uniqueKey);
      console.log("disposeSharedState");
    },
    [results]
  );

  useEffect(() => {
    if (!results) return;
    const { container } = results;
    const stateMap = container.initialObjects.stateMap as SharedMap;
    const valueChangedListener = (changed: IValueChanged): void => {
      console.log("value changed");
      if (registeredSharedSetStateActionMapRef.current.has(changed.key)) {
        const value = stateMap.get(changed.key);
        console.log("value changed and actionMap", value);
        const actionMap = registeredSharedSetStateActionMapRef.current.get(
          changed.key
        );
        actionMap?.forEach((setLocalStateHandler) => {
          setLocalStateHandler(value);
        });
      }
    };
    console.log("listening for changes");
    stateMap.on("valueChanged", valueChangedListener);
    // Set initial values
    stateMap.forEach((value: any, key: string) => {
      const actionMap = registeredSharedSetStateActionMapRef.current.get(key);
      actionMap?.forEach((setLocalStateHandler) => {
        setLocalStateHandler(value);
      });
    });
    return () => {
      console.log("not listening for changes");
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
