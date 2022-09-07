/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { EventEmitter } from "events";

/**
 * Abstracts pointer event emission.
 */
export abstract class InputProvider extends EventEmitter {
    public static readonly PointerDown = "PointerDown"; 
    public static readonly PointerMove = "PointerMove";
    public static readonly PointerUp = "PointerUp";
    public static readonly PointerEnter = "PointerEnter";
    public static readonly PointerLeave = "PointerLeave";

    constructor(readonly element: HTMLElement) {
        super();
    }

    abstract activate(): void;
    abstract deactivate(): void;
}