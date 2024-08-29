import { FC, ReactNode } from "react";
import { FlexRow } from "./flex";
import { tokens } from "@fluentui/react-theme";

export interface INaviationBarProps {
    rightActions?: ReactNode;
    children?: ReactNode;
}

export const NavigationBar: FC<INaviationBarProps> = ({
    children,
    rightActions,
}) => {
    //
    return (
        <FlexRow
            vAlign="center"
            spaceBetween
            style={{
                backgroundColor: tokens.colorNeutralBackground3,
                paddingLeft: "24px",
                paddingRight: "24px",
                paddingTop: "8px",
                paddingBottom: "8px",
            }}
        >
            <FlexRow vAlign="center" gap="medium">
                <div
                    style={{
                        fontWeight: tokens.fontWeightSemibold,
                    }}
                >
                    {"Live Share React"}
                </div>
                {children}
            </FlexRow>
            <FlexRow vAlign="center">{rightActions}</FlexRow>
        </FlexRow>
    );
};
