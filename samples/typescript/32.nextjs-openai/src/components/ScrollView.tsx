import { CSSProperties, FC, ReactNode } from "react";
import { FlexColumn, FlexItem } from "./flex";

interface IScrollViewProps {
    style?: CSSProperties;
    children: ReactNode;
}

export const ScrollView: FC<IScrollViewProps> = (props) => {
    const { style, children } = props;
    return (
        <FlexColumn scroll style={style}>
            <FlexItem noShrink>{children}</FlexItem>
        </FlexColumn>
    );
};
