const { LiveShareClient, TestLiveShareHost } = require("@microsoft/live-share");
const { waitForDelay } = require("@microsoft/live-share/internal");
const {
    InsecureTokenProvider,
} = require("@fluidframework/test-runtime-utils/internal");

const client = new LiveShareClient(
    TestLiveShareHost.create(
        new InsecureTokenProvider("", {
            id: "testId",
            name: "Test User",
        })
    )
);
const canUseLiveShare = client !== undefined;
const canUseLiveShareInternal = waitForDelay(10) !== undefined;

if (!canUseLiveShare) {
    process.exit(1);
}

if (!canUseLiveShareInternal) {
    process.exit(2);
}

console.log("client", client);
console.log(
    "Sucessfully imported and able to use Live Share package in cjs project"
);
