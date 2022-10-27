import { Text, mergeClasses } from "@fluentui/react-components";
import React from "react";
import { FC } from "react";
import { getFlexColumnStyles } from "../styles/layouts";

export const PageError: FC<{ error: any }> = ({ error }) => {
    const flexColumnStyles = getFlexColumnStyles();
    return (
        <div
            className={mergeClasses(
                flexColumnStyles.root,
                flexColumnStyles.fill,
                flexColumnStyles.vAlignCenter,
                flexColumnStyles.hAlignCenter
            )}
        >
            <Text align="center">{`${error}`}</Text>
        </div>
    );
};
