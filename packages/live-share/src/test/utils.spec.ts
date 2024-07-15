import { strict as assert } from "assert";
import {
    TimeoutError,
    timeoutRequest,
    waitForResult,
} from "../internals/utils";

describe("timeoutRequest", function () {
    it("should return the result when request is successful within timeout", async () => {
        const expectedResult = "successful";
        const fnRequest = async () => expectedResult;
        const result = await timeoutRequest(fnRequest, 10);
        assert(result === expectedResult, "unexpected result");
    });

    it("should throw an error when request fails within timeout", async () => {
        const expectedError = new Error("request failed");
        const fnRequest = async () => {
            throw expectedError;
        };
        try {
            await timeoutRequest(fnRequest, 10);
            assert.fail("Expected an error to be thrown");
        } catch (error) {
            assert(error === expectedError, "unexpected error");
        }
    });

    it("should timeout when request takes longer than timeout", async () => {
        const fnRequest = async () =>
            new Promise((resolve) => setTimeout(resolve, 20));
        try {
            await timeoutRequest(fnRequest, 10);
            assert.fail("Expected a timeout error to be thrown");
        } catch (error) {
            assert(
                error instanceof TimeoutError,
                "expected error of TimeoutError"
            );
        }
    });
});

describe("waitForResult", function () {
    it("should return the validated result when request is successful and response is valid", async () => {
        const expectedResult = "successful";
        const fnRequest = async () => "response";
        const fnValidateResponse = (result: string) =>
            result === "response" ? { response: expectedResult } : null;
        const result = await waitForResult(
            fnRequest,
            fnValidateResponse,
            [10],
            10
        );
        assert(result === expectedResult, "unexpected result");
    });

    it("should retry when the validation fails and retrySchedule allows", async () => {
        const expectedResult = "successful";
        let attempt = 0;
        const fnRequest = async () =>
            attempt++ === 1 ? "response" : "invalid";
        const fnValidateResponse = (result: string) =>
            result === "response" ? { response: expectedResult } : null;
        const result = await waitForResult(
            fnRequest,
            fnValidateResponse,
            [10, 20],
            10
        );
        assert(result === expectedResult, "unexpected result");
    });

    it("should fail when the validation fails and retrySchedule doesn't allow more attempts", async () => {
        let attempt = 0;
        const fnRequest = async () =>
            attempt++ === 2 ? "response" : "invalid";
        const fnValidateResponse = (result: string) =>
            result === "response" ? { response: "successful" } : null;
        try {
            await waitForResult(fnRequest, fnValidateResponse, [10]);
            assert.fail("Expected an error to be thrown");
        } catch (error) {
            assert(error instanceof Error, "Expected an instance of Error");
            assert(
                error.message === "waitForResult: invalid response",
                "unexpected error message"
            );
        }
    });

    it("should fail when the request fails and retrySchedule doesn't allow more attempts", async () => {
        const fnRequest = async () => {
            throw new Error("request failed");
        };
        const fnValidateResponse = (result: string) => ({
            response: "successful",
        });
        try {
            await waitForResult(fnRequest, fnValidateResponse, [10], 10);
            assert.fail("Expected an error to be thrown");
        } catch (error) {
            assert(error instanceof Error, "Expected an instance of Error");
            assert(
                error.message === "request failed",
                "unexpected error message"
            );
        }
    });
});
