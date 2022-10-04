/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { InputProvider, IPointerEvent } from "./InputProvider";

function pointerEventToIPointerEvent(e: PointerEvent): IPointerEvent {
    return {
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        x: e.offsetX,
        y: e.offsetY,
        pressure: e.pressure > 0 ? e.pressure : 0.5
    }
}

function getCoalescedEvents(event: PointerEvent): PointerEvent[] {
    // getCoalescedEvents isn't supported in Safari
    if ('getCoalescedEvents' in event) {
        const events: PointerEvent[] = event.getCoalescedEvents();

        // Older versions of Firefox can return an empty list.
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=1511231.
        if (events.length >= 1) {
            return events;
        }
    }

    return [event];
}

/**
* InputProvider implementation that hooks into a DOM element's pointer events.
*/
export class PointerInputProvider extends InputProvider {
    private _activePointerId?: number;

    private capturePointer(pointerId: number) {
        try {
            this.element.setPointerCapture(pointerId);

            this._activePointerId = pointerId;
        }
        catch (e) {
            console.error(`Could not capture pointer with id ${pointerId}: ${e}`);
        }
    }

    private releaseActivePointer() {
        if (this._activePointerId !== undefined) {
            try {
                this.element.releasePointerCapture(this._activePointerId);
            }
            catch (e) {
                console.error(`Could not release pointer with id ${this._activePointerId}: ${e}`);
            }

            this._activePointerId = undefined;
        }
    }

    private onPointerDown = (e: PointerEvent): void => {
        if (this.isActive) {
            if (this._activePointerId === undefined) {
                this.capturePointer(e.pointerId);

                this.pointerDownEvent.emit(pointerEventToIPointerEvent(e));
            }

            e.preventDefault();
            e.stopPropagation();
        }
    };

    private onPointerMove = (e: PointerEvent): void => {
        if (this.isActive) {
            let invokePointerMove = true;

            if (this._activePointerId !== undefined) {
                invokePointerMove = e.pointerId === this._activePointerId;
            }

            if (invokePointerMove) {
                const isPointerDown = this._activePointerId !== undefined;

                const coalescedEvents = getCoalescedEvents(e);

                coalescedEvents.forEach(
                    (evt: PointerEvent) => {
                        this.pointerMoveEvent.emit(
                            {
                                ...pointerEventToIPointerEvent(evt),
                                isPointerDown
                            });
                    });
            }

            e.preventDefault();
            e.stopPropagation();
        }
    };

    private onPointerUp = (e: PointerEvent): void => {
        if (this.isActive) {
            if (this._activePointerId === e.pointerId) {
                this.releaseActivePointer();

                this.pointerUpEvent.emit(pointerEventToIPointerEvent(e));
            }

            e.preventDefault();
            e.stopPropagation();
        }
    };

    private onPointerEnter = (e: PointerEvent): void => {
        if (this.isActive) {
            if (this._activePointerId === undefined) {
                this.pointerEnterEvent.emit(pointerEventToIPointerEvent(e));
            }

            e.preventDefault();
            e.stopPropagation();
        }
    };

    private onPointerLeave = (e: PointerEvent): void => {
        if (this.isActive) {
            if (this._activePointerId === undefined) {
                this.pointerLeaveEvent.emit(pointerEventToIPointerEvent(e));
            }

            e.preventDefault();
            e.stopPropagation();
        }
    };

    activate() {
        super.activate();

        this.element.addEventListener('pointerdown', this.onPointerDown);
        this.element.addEventListener('pointermove', this.onPointerMove);
        this.element.addEventListener('pointerup', this.onPointerUp);
        this.element.addEventListener('pointerenter', this.onPointerEnter);
        this.element.addEventListener('pointerleave', this.onPointerLeave);
    }

    deactivate() {
        super.deactivate();

        this.element.removeEventListener('pointerdown', this.onPointerDown);
        this.element.removeEventListener('pointermove', this.onPointerMove);
        this.element.removeEventListener('pointerup', this.onPointerUp);
        this.element.removeEventListener('pointerenter', this.onPointerEnter);
        this.element.removeEventListener('pointerleave', this.onPointerLeave);
    }

    constructor(readonly element: HTMLElement) {
        super();
    }
}