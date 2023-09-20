import { FC } from "react";
import { FlexColumn } from "./flex";

interface IDecorativeOutlineProps {
    borderColor: string;
}

export const DecorativeOutline: FC<IDecorativeOutlineProps> = ({
    borderColor,
}) => {
    return (
        <FlexColumn
            style={{
                position: "absolute",
                top: 56,
                right: 0,
                bottom: 0,
                left: 0,
                pointerEvents: "none",
                borderStyle: "solid",
                borderLeftWidth: "2px",
                borderRightWidth: "2px",
                borderTopWidth: "2px",
                borderBottomWidth: "2px",
                borderColor,
            }}
        />
    );
};
