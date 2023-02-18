import { getRandomUserName } from "@/utils/getRandomUserName";
import { v4 as uuid } from "uuid";

export const MockContext = {
    // TODO: Delete comments below this line!
    // Deleted code: entityId: "example-app-entity-id",
    page: {
      id: "default-page-id",
      // TODO: Ask Corina for correct frameContext to use in "MockStartContext"
      // There was no "frameContext" value before adding page.id and page.frameContext
      frameContext: "meetingStage",
    },
    // TODO: Move locale into app
    // "Type '{}' is missing the following properties from type 'AppInfo': locale, theme, sessionId, host"
    app: {
      host: {
        clientType: "web",
        name: "Teams",
        sessionId: "example-app-host-session-id",
      },
      locale: "en-US",
      theme: "default",
      sessionId: "example-app-session-id",
    },
    meeting: {
      id: "example-meeting-id",
    },
    chat: {
      id: "example-chat-id",
    },
    user: {
        id: uuid(),
        userPrincipalName: getRandomUserName(),
    },
  };

