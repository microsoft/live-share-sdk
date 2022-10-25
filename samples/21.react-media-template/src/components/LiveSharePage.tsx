import { Text } from "@fluentui/react-components";
import { Spinner } from "@fluentui/react-components";
import { app } from "@microsoft/teams-js";
import { IFluidContainer } from "fluid-framework";
import React from "react";
import { FC, ReactNode, useMemo } from "react";
import { FlexColumn } from "./flex";

export const LiveSharePage: FC<{
  children: ReactNode,
  started: boolean 
  context?: app.Context, 
  container?: IFluidContainer,
}> = ({ children, started, context, container }) => {
  const loadText = useMemo(() => {
    if (!context) {
      return "Loading Teams Client SDK...";
    }
    if (!container) {
      return "Joining Live Share session...";
    }
    if (!started) {
      return "Starting sync...";
    }
    return undefined;
  }, [context, container, started]);

  return (
    <>
      {loadText && (
        <FlexColumn
          hAlignCenter
          vAlignCenter
          style={{
            position: "fixed",
            left: "0px",
            right: "0px",
            top: "0px",
            bottom: "0px",
            zIndex: 9999,
            backgroundColor: "#201F1F",
          }}
        >
          <Spinner />
          <Text
            align="center"
            size={300}
            weight="medium"
            style={{ marginTop: "0.5rem" }}
          >
            {loadText}
          </Text>
        </FlexColumn>
      )}
      <div style={{ visibility: loadText ? "hidden" : undefined }}>
        {children}
      </div>
    </>
  );
};
