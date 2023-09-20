/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { InputProvider, IPointerEvent } from "@microsoft/live-share-canvas";

function pointerEventToIPointerEvent(e: PointerEvent): IPointerEvent {
    return {
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        x: e.clientX,
        y: e.clientY,
        pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
}

function getCoalescedEvents(event: PointerEvent): PointerEvent[] {
    // getCoalescedEvents isn't supported in Safari
    if ("getCoalescedEvents" in event) {
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
export class NonClickablePointerInputProvider extends InputProvider {
    private _activePointerId?: number;

    private onPointerMove = (e: PointerEvent): void => {
        if (this.isActive) {
            let invokePointerMove = true;

            if (this._activePointerId !== undefined) {
                invokePointerMove = e.pointerId === this._activePointerId;
            }

            if (invokePointerMove) {
                const isPointerDown = this._activePointerId !== undefined;

                const coalescedEvents = getCoalescedEvents(e);

                coalescedEvents.forEach((evt: PointerEvent) => {
                    this.pointerMoveEvent.emit({
                        ...pointerEventToIPointerEvent(evt),
                        isPointerDown,
                    });
                });
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

        this.element.addEventListener("pointermove", this.onPointerMove);
        this.element.addEventListener("pointerenter", this.onPointerEnter);
        this.element.addEventListener("pointerleave", this.onPointerLeave);
    }

    deactivate() {
        super.deactivate();

        this.element.removeEventListener("pointermove", this.onPointerMove);
        this.element.removeEventListener("pointerenter", this.onPointerEnter);
        this.element.removeEventListener("pointerleave", this.onPointerLeave);
    }

    constructor(readonly element: HTMLElement) {
        super();
    }
}
