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
    it("should map android bug format to expected format 1", async () => {
        const hostResponse = {
            lock: "972ea631-abc8-4056-ae0e-f4dc7427c4ef",
            _loadStates: [UserMeetingRole.organizer],
            internalState: "displayName",
        };
        const host = new HostWithAndroidBug(
            hostResponse
        ) as unknown as ILiveShareHost;
        const hostWithMapper = new FormatFixHostDecorator(host);
        const expectedResult = {
            userId: "972ea631-abc8-4056-ae0e-f4dc7427c4ef",
            roles: [UserMeetingRole.organizer],
            displayName: "displayName",
        };
        const result = await hostWithMapper.getClientInfo("test");
        assert(
            JSON.stringify(result) === JSON.stringify(expectedResult),
            `unexpected result: ${JSON.stringify(result)}`
        );
    });

    it("should map android bug format to expected format 2", async () => {
        const hostResponse = {
            sup: "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
            blah: [UserMeetingRole.organizer],
        };
        const host = new HostWithAndroidBug(
            hostResponse
        ) as unknown as ILiveShareHost;
        const hostWithMapper = new FormatFixHostDecorator(host);
        const expectedResult = {
            userId: "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
            roles: [UserMeetingRole.organizer],
            displayName: undefined,
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
