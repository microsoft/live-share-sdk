/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { makeStyles } from "@fluentui/react-components";
import { tokens } from "@fluentui/react-theme";

export const getFlexRowStyles = makeStyles({
    root: {
        display: "flex",
        minHeight: "0px",
    },
    fill: {
        width: "100%",
        height: "100%",
    },
    smallGap: {
        "> :not(:last-child)": {
            marginRight: "0.5rem",
        },
    },
    spaceBetween: {
        justifyContent: "space-between",
    },
    hAlignStart: {
        justifyContent: "start",
    },
    hAlignCenter: {
        justifyContent: "center",
    },
    hAlignEnd: {
        justifyContent: "end",
    },
    vAlignStart: {
        alignItems: "start",
    },
    vAlignCenter: {
        alignItems: "center",
    },
    vAlignEnd: {
        alignItems: "end",
    },
});

export const getFlexColumnStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        minHeight: "0px",
    },
    fill: {
        width: "100%",
        height: "100%",
    },
    smallGap: {
        "> :not(:last-child)": {
            marginBottom: "0.5rem",
        },
    },
    spaceBetween: {
        justifyContent: "space-between",
    },
    hAlignStart: {
        alignItems: "start",
    },
    hAlignCenter: {
        alignItems: "center",
    },
    hAlignEnd: {
        alignItems: "end",
    },
    vAlignStart: {
        justifyContent: "start",
    },
    vAlignCenter: {
        justifyContent: "center",
    },
    vAlignEnd: {
        justifyContent: "end",
    },
    scroll: {
        overflowY: "auto",
        msOverflowStyle: "auto",
        maxHeight: "100vh",
        "::-webkit-scrollbar": {
            width: "12px",
        },
        "::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
        },
        "::-webkit-scrollbar-thumb": {
            backgroundColor: tokens.colorPaletteCharcoalBackground3,
            borderLeftColor: tokens.colorPaletteCharcoalBackground2,
            borderLeftWidth: "6px",
            borderLeftStyle: "solid",
            backgroundClip: "padding-box",
            borderTopLeftRadius: "4px",
            borderTopRightRadius: "14px",
            borderBottomLeftRadius: "5px",
            borderBottomRightRadius: "14px",
        },
        "::-webkit-scrollbar-thumb:hover": {
            backgroundColor: tokens.colorPaletteCharcoalForeground3,
        },
    },
});

export const getFlexItemStyles = makeStyles({
    grow: {
        flexGrow: 1,
    },
    noShrink: {
        flexShrink: 0,
    },
});
