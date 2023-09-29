import { Vector3 } from "@babylonjs/core/Maths/math";

const ROUNDING_ERROR_TOLERANCE = 0.000000000001;
export function vectorsAreRoughlyEqual(v1: Vector3, v2: Vector3): boolean {
    if (Math.abs(v1.x - v2.x) >= ROUNDING_ERROR_TOLERANCE) {
        return false;
    }
    if (Math.abs(v1.y - v2.y) >= ROUNDING_ERROR_TOLERANCE) {
        return false;
    }
    if (Math.abs(v1.z - v2.z) >= ROUNDING_ERROR_TOLERANCE) {
        return false;
    }
    return true;
}
