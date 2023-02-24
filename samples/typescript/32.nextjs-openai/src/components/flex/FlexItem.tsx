import { mergeClasses } from "@fluentui/react-components";
import { CSSProperties, FC, ReactNode } from "react";
import { getFlexItemStyles } from "./FlexStyles";

/**
 * Component that renders children `ReactNode` in a flex item.
 */
export const FlexItem: FC<{
    children: ReactNode;
    grow?: boolean;
    noShrink?: boolean;
    style?: CSSProperties;
}> = ({ children, grow, noShrink, style }) => {
    const flexItemStyles = getFlexItemStyles();
    const mergedClasses = mergeClasses(
        grow ? flexItemStyles.grow : "",
        noShrink ? flexItemStyles.noShrink : ""
    );

    return (
        <div className={mergedClasses} style={style}>
            {children}
        </div>
    );
};
