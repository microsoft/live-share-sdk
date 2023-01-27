import { useCallback, useEffect, useRef, useState } from "react";
import { SharedMap } from "fluid-framework";
import { isEntries, isJSON, isMap } from "../utils";
import { IUseSharedMapResults, SharedMapInitialData } from "../types";
import { useDynamicDDS } from "./useDynamicDDS";

/**
 * Helper method for converting different initial data props into a Map<string, TData> to insert into the Fluid SharedMap
 * @template TData Optional typing for objects stored in the SharedMap. Default is `object` type.
 * @param initialData a JS Map, entries array, or JSON object.
 * @returns A Map<string, TData> with the entries provided.
 */
function getInitialData<TData>(
  initialData: SharedMapInitialData<TData>
): Map<string, TData> {
  if (isMap(initialData)) {
    return initialData;
  } else if (isEntries(initialData)) {
    return new Map<string, TData>(initialData);
  } else if (isJSON(initialData)) {
    const values: (readonly [string, TData])[] = Object.keys(initialData).map(
      (key) => {
        return [key, initialData[key]];
      }
    );
    return new Map<string, TData>(values);
  }
  return new Map<string, TData>();
}

/**
 * React hook for using a Fluid `SharedMap`.
 *
 * @remarks
 * The primary benefit of using the `useSharedMap` hook rather than the Fluid `SharedMap`
 * directly is that it integrates nicely with React state and automates repetitive tasks.
 * If you want to use `SharedMap` this hook creates directly, you can do that as well.
 *
 * @template TData Optional typing for objects stored in the SharedMap. Default is `object` type.
 * @param uniqueKey the unique key for the `SharedMap`. If one does not yet exist, a new `SharedMap`
 * will be created, otherwise it will use the existing one.
 * @param initialData a JS Map, entries array, or JSON object to insert into the `SharedMap` when creating
 * the DDS for the first time.
 * @returns stateful `map` entries, `setEntry` callback, `deleteEntry` callback, and the Fluid `sharedMap`.
 */
export function useSharedMap<TData extends object = object>(
  uniqueKey: string,
  initialData?: SharedMapInitialData<TData>
): IUseSharedMapResults<TData> {
  /**
   * Reference boolean for whether hook has registered "valueChanged" events for `SharedMap`.
   */
  const listeningRef = useRef(false);
  /**
   * Stateful readonly map (user facing) with most recent values from `SharedMap` and its setter method.
   */
  const [map, setMap] = useState<ReadonlyMap<string, TData>>(
    getInitialData<TData>(initialData)
  );
  /**
   * Callback method to set the `initialData` into the map when the `SharedMap` is first created.
   * Only should be used as a prop to useDynamicDDS.
   */
  const onFirstInitialize = useCallback((dds: SharedMap) => {
    getInitialData(initialData).forEach((value, key) => {
      dds.set(key, value);
    });
  }, []);
  /**
   * User facing: dynamically load the EphemeralEvent DDS for the given unique key.
   */
  const { dds: sharedMap } = useDynamicDDS<SharedMap>(
    `<SharedMap>:${uniqueKey}`,
    SharedMap,
    onFirstInitialize
  );

  /**
   * User facing: set a value to the Fluid `SharedMap`.
   */
  const setEntry = useCallback(
    (key: string, value: TData) => {
      if (!sharedMap) {
        console.error(new Error("Cannot call set when sharedMap is undefined"));
        return;
      }
      sharedMap.set(key, value);
    },
    [sharedMap]
  );

  /**
   * User facing: delete a value from the Fluid `SharedMap`.
   */
  const deleteEntry = useCallback(
    (key: string) => {
      if (!sharedMap) {
        console.error(
          new Error("Cannot call remove when sharedMap is undefined")
        );
        return;
      }
      sharedMap.delete(key);
    },
    [sharedMap]
  );

  // Setup change listeners, initial values, etc.
  useEffect(() => {
    if (listeningRef.current || !sharedMap) return;
    listeningRef.current = true;

    // Register valueChanged listener for `SharedMap`.
    const onValueChanged = () => {
      setMap(new Map<string, TData>(sharedMap.entries()));
    };
    console.log("valueChanged on");
    sharedMap.on("valueChanged", onValueChanged);
    // Get initial values from `SharedMap`.
    onValueChanged();

    return () => {
      // Cleanup on component unmount.
      listeningRef.current = false;
      console.log("valueChanged off");
      sharedMap?.off("valueChanged", onValueChanged);
    };
  }, [sharedMap]);

  return {
    map,
    setEntry,
    deleteEntry,
    sharedMap,
  };
}
