import * as microsoftTeams from "@microsoft/teams-js";
import { useEffect, useState } from "react";

export const useTeamsContext = () => {
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    if (!ctx?.userObjectId) {
      // Get Context from the Microsoft Teams SDK
      microsoftTeams.getContext((context) => {
        setCtx(context);
      });
    }
  }, [ctx?.userObjectId]);

  return ctx;
};
