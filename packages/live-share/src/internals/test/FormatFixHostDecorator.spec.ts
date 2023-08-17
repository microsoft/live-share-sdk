import { ILiveShareHost, UserMeetingRole, IClientInfo } from "../../interfaces";
import { strict as assert } from "assert";
import { FormatFixHostDecorator } from "..";

class HostWithAndroidBug {
    constructor(private result: unknown) {}
    public async getClientInfo(
        clientId: string
    ): Promise<IClientInfo | undefined> {
        return this.result as IClientInfo;
    }
}

describe("FormatFixHostDecorator tests", function () {
    it("should map android bug format to expected format", async () => {
        const hostResponse = {
            lock: "userId",
            _loadStates: [UserMeetingRole.organizer],
            internalState: "displayName",
        };
        const host = new HostWithAndroidBug(
            hostResponse
        ) as unknown as ILiveShareHost;
        const hostWithMapper = new FormatFixHostDecorator(host);
        const expectedResult = {
            userId: "userId",
            roles: [UserMeetingRole.organizer],
            displayName: "displayName",
        };
        const result = await hostWithMapper.getClientInfo("test");
        assert(
            JSON.stringify(result) === JSON.stringify(expectedResult),
            `unexpected result: ${JSON.stringify(result)}`
        );
    });

    it("should not map if already expected format", async () => {
        const hostResponse = {
            userId: "userId",
            roles: [UserMeetingRole.organizer],
            displayName: "displayName",
        };
        const host = new HostWithAndroidBug(
            hostResponse
        ) as unknown as ILiveShareHost;
        const hostWithMapper = new FormatFixHostDecorator(host);
        const result = await hostWithMapper.getClientInfo("test");
        assert(
            JSON.stringify(result) === JSON.stringify(hostResponse),
            `unexpected result: ${JSON.stringify(result)}`
        );
    });
});
