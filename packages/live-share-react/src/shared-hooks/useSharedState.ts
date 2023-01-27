import { useCallback, useEffect, useRef, useState } from "react";
import { useFluidObjectsContext } from "../providers";
import { DisposeSharedStateAction, SetSharedStateAction } from "../types";
import { v4 as uuid } from "uuid";

/**
 * Inspired by React's `useState` hook, `useSharedState` makes it easy to synchronize state in your app.
 *
 * @remarks
 * Values set through this state is automatically attached to a `SharedMap` that the `FluidContextProvider`
 * creates. If you are synchronizing complex data structures that multiple users will be setting simultaneously,
 * consider using an optimized hook for your data structure (e.g., `useSharedMap`, `useSharedString`, etc.).
 *
 * @template S Typing for objects stored associated with the `uniqueKey`.
 * @param uniqueKey the unique key for a `SharedMap`. If you use the same key for multiple components, those components will reference the same state.
 * @param initialState a default state for the `SharedMap`.
 *
 * @returns a stateful value, the function to update it, and an optional dispose method to delete it from the `SharedMap`.
 */
export function useSharedState<S>(
  uniqueKey: string,
  initialState: S
): [S, SetSharedStateAction<S>, DisposeSharedStateAction] {
  /**
   * User facing: stateful value and non-user facing setter.
   */
  const [localState, setLocalState] = useState<S>(initialState);
  /**
   * Unique ID reference for the component.
   */
  const componentIdRef = useRef(uuid());
  /**
   * Register set state callbacks from FluidContextProvider and update/delete callbacks for initial object's `stateMap`.
   */
  const {
    registerSharedSetStateAction,
    unregisterSharedSetStateAction,
    updateSharedState,
    deleteSharedState,
  } = useFluidObjectsContext();

  /**
   * User facing: callback to change the shared state.
   */
  const setSharedState: SetSharedStateAction<S> = useCallback(
    (updatedState: S) => {
      console.log("setSharedState");
      setLocalState(updatedState);
      updateSharedState(uniqueKey, updatedState);
    },
    [uniqueKey, setLocalState, updateSharedState]
  );

  /**
   * User facing: callback to dispose the shared state from the `stateMap`.
   */
  const disposeSharedState: DisposeSharedStateAction = useCallback(() => {
    console.log("setSharedState");
    deleteSharedState(uniqueKey);
  }, [uniqueKey, deleteSharedState]);

  /**
   * Once container is available, this effect will register the setter method so that the `S` value
   * from `stateMap` that matches `uniqueKey` can be passed back to this hook whenever changed.
   *
   * @see registerSharedSetStateAction to see how new values from `stateMap` are passed to this hook.
   * @see unregisterSharedSetStateAction to see how this component stops listening to changes in the `stateMap`.
   */
  useEffect(() => {
    console.log("sharedStateOn");
    registerSharedSetStateAction(
      uniqueKey,
      componentIdRef.current,
      setLocalState
    );
    return () => {
      console.log("sharedStateOff");
      unregisterSharedSetStateAction(uniqueKey, componentIdRef.current);
    };
  }, []);

  return [localState, setSharedState, disposeSharedState];
}
