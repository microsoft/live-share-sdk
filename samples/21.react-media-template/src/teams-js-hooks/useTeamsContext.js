/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as microsoftTeams from "@microsoft/teams-js";
import { useEffect, useState } from "react";
import { inTeams } from "../utils/inTeams";

export const useTeamsContext = () => {
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    if (!ctx?.userObjectId) {
      // Add inTeams=true to URL params to get real Teams context
      if (inTeams()) {
        console.log("Attempting to get Teams context");
        // Get Context from the Microsoft Teams SDK
        microsoftTeams.getContext((context) => {
          setCtx(context);
        });
      } else {
        // Simulate Teams userObjectId for browser testing
        setCtx({
          userObjectId: `user${Math.abs(Math.random() * 999999999)}`,
        });
      }
    }
  }, [ctx?.userObjectId]);

  return ctx;
};
