import "mocha";
import { strict as assert } from "assert";
import { Stroke, IPointerPoint, IColor, IRect } from "../core";

export const coordinateSerializationPrecision = Stroke[
    "coordinateSerializationPrecision"
] as number;
export const pressureSerializationPrecision = Stroke[
    "pressureSerializationPrecision"
] as number;

export function copyPointArrayAndDuplidateEachPoint(
    source: IPointerPoint[]
): IPointerPoint[] {
    const result: IPointerPoint[] = [];

    for (const p of source) {
        result.push(p);
        result.push(p);
    }

    return result;
}

export function reducePrecision(n: number, precision: number): number {
    const multiplier = Math.pow(10, precision);
    const roundedNumber = (n * multiplier).toFixed(0);

    return parseFloat(roundedNumber) / multiplier;
}

export function reducePointPrecision(p: IPointerPoint): IPointerPoint {
    return {
        x: reducePrecision(p.x, coordinateSerializationPrecision),
        y: reducePrecision(p.y, coordinateSerializationPrecision),
        pressure: reducePrecision(p.pressure, pressureSerializationPrecision),
    };
}

export function reducePointArrayPrecision(
    points: IPointerPoint[]
): IPointerPoint[] {
    const result: IPointerPoint[] = [];

    for (const p of points) {
        result.push(reducePointPrecision(p));
    }

    return result;
}

export function assertPointArraysEqual(
    points1: IPointerPoint[],
    points2: IPointerPoint[]
) {
    assert(
        points1.length === points2.length,
        `Point arrays lengths should be equal but are not (${points1.length} vs ${points2.length})`
    );

    for (let i = 0; i < points1.length; i++) {
        assertObjectsEqual(points1[i], points2[i], "Points are not equal");
    }
}

export function assertObjectsEqual(
    expected: Object,
    actual: Object,
    errorMessage: string
) {
    const propertyNames = Object.getOwnPropertyNames(expected);

    for (const p of propertyNames) {
        const expectedCast = expected as any;
        const actualCast = actual as any;
        assert(
            expectedCast[p] === actualCast[p],
            errorMessage +
                ` (expected = ${JSON.stringify(
                    expected
                )}, actual = ${JSON.stringify(actual)})`
        );
    }
}
