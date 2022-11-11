/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { makeStyles, shorthands } from "@fluentui/react-components";
import { tokens } from "@fluentui/react-theme";

export const getVideoStyle = makeStyles({
    root: {
        cursor: "pointer",
        zIndex: 0,
        position: "fixed",
        backgroundColor: "black",
        display: "flex",
        flexDirection: "column",
        minHeight: "0px",
        justifyContent: "center",
        alignItems: "center",
        outlineWidth: "0px",
    },
});

export const getPlayerControlStyles = makeStyles({
    root: {
        backgroundColor: "black",
        position: "absolute",
        zIndex: 0,
        top: "0",
        right: "0",
        left: "0",
        bottom: "0",
    },
});

export const getProgressBarStyles = makeStyles({
    root: {
        width: "100%",
        cursor: "pointer",
        minHeight: "0px",
    },
    input: {
        cursor: "pointer",
    },
    rail: {
        backgroundImage: `linear-gradient(
      to right,  
      rgba(255,255,255, 1) 0%, 
      rgba(255,255,255,1) var(--oneplayer-play-progress-percent), 
      rgba(255,255,255,0.5) var(--oneplayer-play-progress-percent), 
      rgba(255,255,255,0.5) var(--oneplayer-buff-progress-percent),  
      rgba(255,255,255,0.3) var(--oneplayer-buff-progress-percent), 
      rgba(255,255,255,0.3) 100%)
    `,
        ":before": {
            backgroundImage: "none",
        },
    },
    thumb: {
        width: "1rem",
        height: "1rem",
        backgroundColor: "white",
        boxShadow: "none",
        ":before": {
            ...shorthands.borderColor("white"),
        },
    },
    pageEl: {
        backgroundColor: "transparent",
        color: "white",
        ...shorthands.padding(".75rem"),
    },
});

export const getPillStyles = makeStyles({
    root: {
        backgroundColor: tokens.colorNeutralBackground3,
        color: tokens.colorNeutralForeground1,
        pointerEvents: "none",
        fontSize: "1rem",
        lineHeight: "100%",
        paddingTop: "0.6rem",
        paddingBottom: "0.6rem",
        paddingLeft: "0.8rem",
        paddingRight: "0.8rem",
        borderTopLeftRadius: "1.6rem",
        borderTopRightRadius: "1.6rem",
        borderBottomLeftRadius: "1.6rem",
        borderBottomRightRadius: "1.6rem",
        marginBottom: "0.8rem",
        maxWidth: "80%",
    },
});

export const getResizeReferenceStyles = makeStyles({
    root: {
        position: "absolute",
        zIndex: 0,
        top: "0",
        bottom: "0",
        left: "0",
        right: "0",
        textAlign: "center",
        pointerEvents: "none",
    },
});

export const getLiveNotificationStyles = makeStyles({
    root: {
        pointerEvents: "none",
        position: "absolute",
        zIndex: 200,
        top: "5px",
        left: "4px",
        right: "4px",
        textAlign: "center",
    },
});
