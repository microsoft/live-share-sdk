import { ILiveShareHost, UserMeetingRole, IClientInfo } from "../../interfaces";
import { strict as assert } from "assert";
import { FormatFixHostDecorator } from "..";

class HostWithAndroidBug {
    public async getClientInfo(
        clientId: string
    ): Promise<IClientInfo | undefined> {
        return {
            lock: "userId",
            _loadStates: [UserMeetingRole.organizer],
            internalState: "displayName",
        } as unknown as IClientInfo;
    }
}

describe("FormatFixHostDecorator tests", function () {
    it("should map android bug format to expected format", async () => {
        const host = new HostWithAndroidBug() as ILiveShareHost;
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
});
