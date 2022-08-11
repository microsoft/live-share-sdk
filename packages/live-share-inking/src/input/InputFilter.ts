/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */

import { IPointerPoint } from "../core/Geometry";

/**
 * Defines an input filter. Input filters are used to transform
 * input points on the fly.
 */
export abstract class InputFilter {
    /**
     * Filters (transforms) the specified point.
     * @param p The point to transform.
     */
    abstract filterPoint(p: IPointerPoint): IPointerPoint;

    /**
     * Resets this filter. Some filters use information about
     * previous points to transform the next point. `reset` will
     * be called automatically by InkingManager when a new wet
     * stroke begins.
     * @param startPoint The new starting point.
     */
    reset(startPoint: IPointerPoint): void {
        // Do nothing in base implementation
    }
}

/**
 * Represents a collection of input filters.
 */
export class InputFilterCollection {
    private _items: InputFilter[] = [];

    /**
     * Creates a new InputFilterCollection instance.
     * @param items The initial inputs filters.
     */
    constructor(...items: InputFilter[]) {
        this._items.push(...items);
    }

    /**
     * Adds filters to the collection.
     * @param items The filters to add.
     */
    addFilters(...items: InputFilter[]) {
        this._items.push(...items);
    }

    /**
     * Resets all the filters in the collection. Some filters
     * use information about previous points to transform the
     * next point. `reset` will be called automatically by
     * InkingManager when a new wet stroke begins.
     * @param startPoint The new starting point.
     */
    reset(startPoint: IPointerPoint) {
        for (const filter of this._items) {
            filter.reset(startPoint);
        }
    }

    /**
     * Filters (transforms) the specified point through each
     * of the individual filters in the collection.
     * @param p The point to transform.
     * @returns The transformed point.
     */
    filterPoint(p: IPointerPoint): IPointerPoint {
        let currentPoint = p;

        for (const filter of this._items) {
            currentPoint = filter.filterPoint(currentPoint);
        }

        return currentPoint;
    }
}
