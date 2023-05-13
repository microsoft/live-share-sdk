/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { useState, useRef, useCallback } from "react";

export const useStateRef = (initialValue) => {
    const reference = useRef(initialValue);
    const [state, setState] = useState(reference.current);

    const setValue = useCallback((value) => {
        reference.current = value;
        setState(reference.current);
    }, []);

    return [state, reference, setValue];
};
