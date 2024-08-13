import { LiveShareClient, TestLiveShareHost } from "@microsoft/live-share";
import { waitForDelay } from "@microsoft/live-share/internal";

const client = new LiveShareClient(TestLiveShareHost.create());
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
    "Sucessfully imported and able to use Live Share package in esm project"
);
