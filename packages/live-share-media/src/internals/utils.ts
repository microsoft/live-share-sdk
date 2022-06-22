/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the Microsoft Live Share SDK License.
 */
        
/**
 * @hidden
 * Tracks a range of values for an array of numbers.
 */
export interface INumberRange {
    count: number;
    max: number;
    median: number;
    min: number;
}

/**
 * @hidden
 * Adds a local value to a number range
 */
export interface ILocalNumberRange extends INumberRange {
    local: number;
}

/**
 * @hidden
 * Finds the min/median/max for a range of numbers.
 * @param values Optional. Array of numbers to find the range for. 
 * @returns The min/median/max of the number range or all `-1` values if no numbers passed in.
 */
export function findNumberRange(values?: number[]): INumberRange {
    let count = Array.isArray(values) ? values.length : 0;
    let max = -1;
    let median = -1;
    let min = -1;
    if (count > 0) {
        values!.sort((a, b) => a - b);
        min = values![0];
        max = values![count - 1];

        // Find median
        const half = Math.floor(count / 2)
        if (count % 2) {
            median = values![half];
        } else {
            median = (values![half - 1] + values![half]) / 2.0;
        }
    } 
    
    return { max, median, min, count };
}