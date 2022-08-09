/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IPointerPoint } from "../core/Geometry";

export abstract class InputFilter {
    abstract filterPoint(p: IPointerPoint): IPointerPoint;

    reset(startPoint: IPointerPoint): void {
        // Do nothing in base implementation
    }
}

export class InputFilterCollection {
    private _items: InputFilter[] = [];

    constructor(...items: InputFilter[]) {
        this._items.push(...items);
    }

    addFilters(...items: InputFilter[]) {
        this._items.push(...items);
    }

    reset(startPoint: IPointerPoint) {
        for (const filter of this._items) {
            filter.reset(startPoint);
        }
    }

    filterPoint(p: IPointerPoint): IPointerPoint {
        let currentPoint = p;

        for (const filter of this._items) {
            currentPoint = filter.filterPoint(currentPoint);
        }

        return currentPoint;
    }
}
