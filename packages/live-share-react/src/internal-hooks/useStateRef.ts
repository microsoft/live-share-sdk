/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useState, useRef, useCallback, MutableRefObject } from "react";

export function useStateRef<T>(initialValue: T): [T, MutableRefObject<T>, (value: T) => void] {
  const reference = useRef(initialValue);
  const [state, setState] = useState(reference.current);

  const setValue = useCallback(
    (value: T) => {
      reference.current = value;
      setState(reference.current);
    },
    [reference, setState],
  );

  return [state, reference, setValue];
}

