import "mocha";
import { strict as assert } from "assert";
import {
    toCssRgbaColor,
    fromCssColor,
    IColor,
    IRect,
    IPoint,
    expandRect,
    screenToViewport,
    viewportToScreen,
    ISegment,
} from "../core";
import { assertObjectsEqual } from "./Utils.spec";
import {
    doRectanglesOverlap,
    getSegmentsIntersection,
    isPointInsideRectangle,
    isRectangleInsideRectangle,
    segmentsMayIntersect,
} from "../core/internals";

const testColor: IColor = { r: 193, g: 221, b: 202 };
const serializedTestColor = "#C1DDCA";

describe("Color", () => {
    it("serializes to CSS rgba()", async () => {
        const rgbaColor = toCssRgbaColor(testColor, 0.8);
        const expectedRgbaColor = "rgba(193,221,202,0.8)";

        assert(
            rgbaColor === expectedRgbaColor,
            `Color didn't serialize as expected: expected = ${expectedRgbaColor}, actual = ${rgbaColor}`
        );
    });

    it("deserializes from #RRGGBB format", async () => {
        const deserializedColor = fromCssColor(serializedTestColor);

        assertObjectsEqual(
            deserializedColor,
            testColor,
            `Colors are not equal`
        );
    });
});

const testRect: IRect = {
    left: 50,
    top: 30,
    right: 90,
    bottom: 100,
};

interface IUnionRectTest {
    sourceRect: IRect;
    point: IPoint;
    expected: IRect;
}

describe("Geometry", () => {
    it("expandRect", async () => {
        const tests: IUnionRectTest[] = [
            {
                sourceRect: testRect,
                point: { x: 30, y: 50 },
                expected: { ...testRect, left: 30 },
            },
            {
                sourceRect: testRect,
                point: { x: 30, y: 20 },
                expected: { ...testRect, left: 30, top: 20 },
            },
            {
                sourceRect: testRect,
                point: { x: 60, y: 20 },
                expected: { ...testRect, top: 20 },
            },
            {
                sourceRect: testRect,
                point: { x: 100, y: 20 },
                expected: { ...testRect, right: 100, top: 20 },
            },
            {
                sourceRect: testRect,
                point: { x: 100, y: 50 },
                expected: { ...testRect, right: 100 },
            },
            {
                sourceRect: testRect,
                point: { x: 100, y: 110 },
                expected: { ...testRect, right: 100, bottom: 110 },
            },
            {
                sourceRect: testRect,
                point: { x: 60, y: 110 },
                expected: { ...testRect, bottom: 110 },
            },
            {
                sourceRect: testRect,
                point: { x: 30, y: 110 },
                expected: { ...testRect, left: 30, bottom: 110 },
            },
            {
                sourceRect: testRect,
                point: { x: 60, y: 60 },
                expected: { ...testRect },
            },
        ];

        for (const test of tests) {
            const actual = expandRect(test.sourceRect, test.point);

            assertObjectsEqual(
                test.expected,
                actual,
                `Didn't produce the expected rectangle.`
            );
        }
    });

    it("Screen/viewport roundtrip", async () => {
        const expected = { x: 153, y: 95, pressure: 1 };
        const referencePoint = { x: 17, y: 44 };
        const offset = { x: -50, y: 50 };

        const viewPortPoint = screenToViewport(
            expected,
            referencePoint,
            offset,
            0.7
        );
        const backToScreenPoint = viewportToScreen(
            viewPortPoint,
            referencePoint,
            offset,
            0.7
        );

        const actual = { ...backToScreenPoint, pressure: 1 };

        assertObjectsEqual(expected, actual, "The point didn't roundtrip.");
    });

    interface IPointTest {
        p: IPoint;
        expected: boolean;
    }

    it("isPointInsideRectangle", async () => {
        const r: IRect = { left: 30, top: 20, right: 80, bottom: 100 };
        const tests: IPointTest[] = [
            { p: { x: 20, y: 50 }, expected: false },
            { p: { x: 40, y: 10 }, expected: false },
            { p: { x: 40, y: 30 }, expected: true },
        ];

        for (const test of tests) {
            const actual = isPointInsideRectangle(test.p, r);

            assert(
                actual === test.expected,
                `isPointInsideRectangle is incorrect for p = ${JSON.stringify(
                    test.p
                )} and r = ${r}. Expected = ${
                    test.expected
                }, actual = ${actual}`
            );
        }
    });

    interface IRectangleTest {
        r: IRect;
        expected: boolean;
    }

    it("isRectangleInsideRectangle", async () => {
        const r: IRect = { left: 50, top: 50, right: 100, bottom: 100 };
        const tests: IRectangleTest[] = [
            { r: { left: 0, top: 0, right: 40, bottom: 40 }, expected: false },
            {
                r: { left: 110, top: 110, right: 140, bottom: 140 },
                expected: false,
            },
            {
                r: { left: 75, top: 75, right: 140, bottom: 140 },
                expected: false,
            },
            { r: { left: 0, top: 0, right: 75, bottom: 75 }, expected: false },
            { r: { left: 60, top: 60, right: 90, bottom: 90 }, expected: true },
        ];

        for (const test of tests) {
            const actual = isRectangleInsideRectangle(test.r, r);

            assert(
                actual === test.expected,
                `isRectangleInsideRectangle is incorrect for r1 = ${JSON.stringify(
                    test.r
                )} and r2 = ${r}. Expected = ${
                    test.expected
                }, actual = ${actual}`
            );
        }
    });

    it("doRectanglesOverlap", async () => {
        const r: IRect = { left: 50, top: 50, right: 100, bottom: 100 };
        const tests: IRectangleTest[] = [
            { r: { left: 0, top: 0, right: 40, bottom: 40 }, expected: false },
            {
                r: { left: 110, top: 110, right: 140, bottom: 140 },
                expected: false,
            },
            {
                r: { left: 75, top: 75, right: 140, bottom: 140 },
                expected: true,
            },
            { r: { left: 0, top: 0, right: 75, bottom: 75 }, expected: true },
            { r: { left: 60, top: 60, right: 90, bottom: 90 }, expected: true },
        ];

        for (const test of tests) {
            const actual = doRectanglesOverlap(test.r, r);

            assert(
                actual === test.expected,
                `doRectanglesOverlap is incorrect for r1 = ${JSON.stringify(
                    test.r
                )} and r2 = ${r}. Expected = ${
                    test.expected
                }, actual = ${actual}`
            );
        }
    });

    interface ISegmentTest {
        s: ISegment;
        expected: boolean;
    }

    it("segmentsMayIntersect", async () => {
        const s: ISegment = {
            from: { x: 50, y: 80 },
            to: { x: 80, y: 50 },
        };
        const tests: ISegmentTest[] = [
            {
                s: {
                    from: { x: 0, y: 80 },
                    to: { x: 40, y: 50 },
                },
                expected: false,
            },
            {
                s: {
                    from: { x: 60, y: 0 },
                    to: { x: 70, y: 90 },
                },
                expected: true,
            },
            {
                s: {
                    from: { x: 60, y: 0 },
                    to: { x: 70, y: 40 },
                },
                expected: false,
            },
            {
                s: {
                    from: { x: 60, y: 85 },
                    to: { x: 70, y: 100 },
                },
                expected: false,
            },
        ];

        for (const test of tests) {
            const actual = segmentsMayIntersect(test.s, s);

            assert(
                actual === test.expected,
                `segmentsMayIntersect is incorrect for s1 = ${JSON.stringify(
                    test.s
                )} and s2 = ${s}. Expected = ${
                    test.expected
                }, actual = ${actual}`
            );
        }
    });

    interface ISegmentIntersectionTest {
        s: ISegment;
        expected?: IPoint;
    }

    it("getSegmentsIntersection", async () => {
        const s: ISegment = {
            from: { x: 1, y: 1 },
            to: { x: 5, y: 5 },
        };
        const tests: ISegmentIntersectionTest[] = [
            {
                s: {
                    from: { x: 0, y: 3 },
                    to: { x: 3, y: 0 },
                },
                expected: { x: 1.5, y: 1.5 },
            },
            {
                s: {
                    from: { x: 0, y: 3 },
                    to: { x: 3, y: 6 },
                },
            },
        ];

        for (const test of tests) {
            const actual = getSegmentsIntersection(test.s, s);

            if (actual && test.expected) {
                assertObjectsEqual(
                    test.expected,
                    actual,
                    `getSegmentsIntersection is incorrect for s1 = ${JSON.stringify(
                        test.s
                    )} and s2 = ${s}`
                );
            } else if (!actual && !test.expected) {
                // The test passed
            } else {
                assert(
                    false,
                    `getSegmentsIntersection is incorrect for s1 = ${JSON.stringify(
                        test.s
                    )} and s2 = ${s}. Expected = ${JSON.stringify(
                        test.expected
                    )}, actual = ${JSON.stringify(actual)}`
                );
            }
        }
    });
});
