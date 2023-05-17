import { strict as assert } from "assert";
import { timeoutRequest, Deferred, waitForResult, TimeoutError } from "../internals";

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
            assert(error instanceof TimeoutError, "expected error of TimeoutError");
        }
    });

    it("should call lateFinish when request finishes after timeout", async () => {
        const lateFinishCalled = new Deferred();
        const fnRequest = () => {
            const lateRequestFinished = new Deferred();
            setTimeout(() => {
                lateRequestFinished.resolve();
            }, 20);
            return lateRequestFinished.promise;
        };
        try {
            await timeoutRequest(fnRequest, 10, () => {
                lateFinishCalled.resolve();
            });
        } catch (error) {
            // We expect a timeout error here, so we just swallow it
        }
        await lateFinishCalled.promise;
    });
});

describe("waitForResult", function () {
    it("should return the validated result when request is successful and response is valid", async () => {
        const expectedResult = "successful";
        const fnRequest = async () => "response";
        const fnValidateResponse = (result: string) =>
            result === "response" ? { response: expectedResult } : null;
        const fnTimeout = (reason: unknown) => new TimeoutError();
        const result = await waitForResult(
            fnRequest,
            fnValidateResponse,
            fnTimeout,
            [10],
            undefined,
            undefined,
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
        const fnTimeout = (reason: unknown) => new TimeoutError();
        const result = await waitForResult(
            fnRequest,
            fnValidateResponse,
            fnTimeout,
            [10, 20],
            undefined,
            undefined,
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
        const fnTimeout = (reason: unknown) => new TimeoutError();
        try {
            await waitForResult(fnRequest, fnValidateResponse, fnTimeout, [10]);
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
        const fnTimeout = (reason: unknown) => new TimeoutError();
        const fnRequestError = (error: unknown) =>
            error instanceof Error ? error : null;
        try {
            await waitForResult(
                fnRequest,
                fnValidateResponse,
                fnTimeout,
                [10],
                fnRequestError,
                undefined,
                10
            );
            assert.fail("Expected an error to be thrown");
        } catch (error) {
            assert(error instanceof Error, "Expected an instance of Error");
            assert(
                error.message === "request failed",
                "unexpected error message"
            );
        }
    });

    it("should retry when the request fails, retrySchedule allows more attempts, and fnRequestError doesn't reject", async () => {
        const expectedResult = "successful";
        let attempt = 0;
        const fnRequest = async () => {
            if (attempt++ === 0) {
                throw new Error("request failed");
            } else {
                return "response";
            }
        };
        const fnValidateResponse = (result: string) =>
            result === "response" ? { response: expectedResult } : null;
        const fnTimeout = (reason: unknown) => new TimeoutError();
        const fnRequestError = (error: unknown) => null;
        const result = await waitForResult(
            fnRequest,
            fnValidateResponse,
            fnTimeout,
            [10, 20],
            fnRequestError,
            undefined,
            10
        );
        assert(result === expectedResult, "unexpected result");
    });

    it("should fail when the request fails, retrySchedule allows more attempts, but fnRequestError rejects", async () => {
        let attempt = 0;
        const fnRequest = async () => {
            if (attempt++ === 0) {
                throw new Error("request failed");
            } else {
                return "response";
            }
        };
        const fnValidateResponse = (result: string) =>
            result === "response" ? { response: "successful" } : null;
        const fnTimeout = (reason: unknown) => new TimeoutError();
        const fnRequestError = (error: unknown) =>
            error instanceof Error ? error : null;
        try {
            await waitForResult(
                fnRequest,
                fnValidateResponse,
                fnTimeout,
                [10, 20],
                fnRequestError,
                undefined,
                10
            );
            assert.fail("Expected an error to be thrown");
        } catch (error) {
            assert(error instanceof Error, "Expected an instance of Error");
            assert(
                error.message === "request failed",
                "unexpected error message"
            );
        }
    });

    it("should call lateFinish when the request takes more time than allowed", async () => {
        const lateFinished = new Deferred();
        const lateFinish = () => {
            lateFinished.resolve();
        };
        const fnRequest = async () =>
            new Promise<string>((resolve) =>
                setTimeout(resolve, 20, "response")
            );
        const fnValidateResponse = (result: string) =>
            result === "response" ? { response: "successful" } : null;
        const fnTimeout = (reason: unknown) => new TimeoutError();
        try {
            await waitForResult(
                fnRequest,
                fnValidateResponse,
                fnTimeout,
                [2],
                undefined,
                lateFinish,
                2
            );
            assert.fail("this should never happen");
        } catch (error) {
            // We expect a timeout error here, so we just swallow it
        }
        await lateFinished.promise;
    });
});
