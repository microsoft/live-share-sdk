/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { InputProvider } from "./InputProvider";

/**
 * InputProvide implementation that hooks into a DOM element's pointer events.
 */
export class PointerInputProvider extends InputProvider {
    private onPointerDown = (e: PointerEvent): void => {
        this.emit(InputProvider.PointerDown, e);
    };

    private onPointerMove = (e: PointerEvent): void => {
        this.emit(InputProvider.PointerMove, e);
    };

    private onPointerUp = (e: PointerEvent): void => {
        this.emit(InputProvider.PointerUp, e);
    };
    
    private onPointerEnter = (e: PointerEvent): void => {
        this.emit(InputProvider.PointerEnter, e);
    };
    
    private onPointerLeave = (e: PointerEvent): void => {
        this.emit(InputProvider.PointerLeave, e);
    };
    
    activate() {
        this.element.addEventListener('pointerdown', this.onPointerDown);
        this.element.addEventListener('pointermove', this.onPointerMove);
        this.element.addEventListener('pointerup', this.onPointerUp);
        this.element.addEventListener('pointerenter', this.onPointerEnter);
        this.element.addEventListener('pointerleave', this.onPointerLeave);
    }

    deactivate() {
        this.element.removeEventListener('pointerdown', this.onPointerDown);
        this.element.removeEventListener('pointermove', this.onPointerMove);
        this.element.removeEventListener('pointerup', this.onPointerUp);
        this.element.removeEventListener('pointerenter', this.onPointerEnter);
        this.element.removeEventListener('pointerleave', this.onPointerLeave);
    }
}