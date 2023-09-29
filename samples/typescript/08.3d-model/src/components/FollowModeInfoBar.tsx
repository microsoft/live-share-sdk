import { FC, ReactNode } from "react";
import { FlexRow } from "./flex";
import { FollowModeType, IFollowModeState } from "@microsoft/live-share";
import { tokens } from "@fluentui/react-theme";
import { ICustomFollowData } from "../pages";

interface IFollowModeInfoBarProps {
    children?: ReactNode;
    remoteCameraState: IFollowModeState<ICustomFollowData | undefined>;
}

export const FollowModeInfoBar: FC<IFollowModeInfoBarProps> = ({
    children,
    remoteCameraState,
}) => {
    return (
        <FlexRow
            hAlign="center"
            vAlign="center"
            style={{
                position: "absolute",
                top: 72,
                left: "50%",
                transform: "translate(-50% , 0%)",
                "-webkit-transform": "translate(-50%, 0%)",
                paddingBottom: "4px",
                paddingTop: "4px",
                paddingLeft: "16px",
                paddingRight: "4px",
                borderRadius: "4px",
                minHeight: "24px",
                backgroundColor:
                    remoteCameraState.type === FollowModeType.activePresenter ||
                    remoteCameraState.type === FollowModeType.activeFollowers
                        ? tokens.colorPaletteRedBackground3
                        : tokens.colorPaletteBlueBorderActive,
            }}
        >
            {children}
        </FlexRow>
    );
};
