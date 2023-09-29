import { FC, ReactNode } from "react";
import { FlexRow } from "./flex";
import { tokens } from "@fluentui/react-theme";

interface ITopHeaderBarProps {
    children?: ReactNode;
    left?: ReactNode;
    right?: ReactNode;
}

export const TopHeaderBar: FC<ITopHeaderBarProps> = ({
    children,
    left,
    right,
}) => {
    return (
        <FlexRow
            spaceBetween
            vAlign="center"
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                paddingTop: "12px",
                paddingLeft: "20px",
                paddingRight: "20px",
                paddingBottom: "12px",
                backgroundColor: tokens.colorNeutralBackground4,
            }}
        >
            <FlexRow
                style={{
                    width: "132px",
                }}
            >
                {left}
            </FlexRow>
            <FlexRow vAlign="center" hAlign="center">
                {children}
            </FlexRow>
            <FlexRow
                gap="small"
                vAlign="center"
                hAlign="end"
                style={{
                    width: "132px",
                }}
            >
                {right}
            </FlexRow>
        </FlexRow>
    );
};
