import { LivePresenceUser } from "@microsoft/live-share";
import { FC, RefObject, useEffect, useState } from "react";
import { IUserData } from "./LiveAvatars";
import {
    getAvatarBackgroundColorStyle,
    getAvatarColor,
} from "../utils/avatar-color";
import { Avatar, tokens } from "@fluentui/react-components";

export const Cursor: FC<{
    user: LivePresenceUser<IUserData>;
    textareaRef: RefObject<HTMLTextAreaElement>;
}> = ({ user, textareaRef }) => {
    const [showAvatar, setShowAvatar] = useState(true);
    const selection = user.data?.selection;

    useEffect(() => {
        let mounted = true;
        console.log("mount cursor");
        // Whenever selection changes, we reshow the avatar
        setShowAvatar(true);
        let timer = setTimeout(() => {
            console.log("cursor timeout", mounted);
            if (!mounted) return;
            setShowAvatar(false);
        }, 2000);
        return () => {
            console.log("unmount cursor");
            mounted = false;
            clearTimeout(timer);
        };
    }, [selection?.start, selection?.end]);
    if (!selection) return null;
    if (!textareaRef.current) return null;
    const textValue = textareaRef.current.value;
    const beforeSelectionText = textValue.substring(0, selection.start);
    const selectionText = textValue.substring(selection.start, selection.end);
    const afterSelectionText = textValue.substring(
        selection.end,
        textValue.length
    );
    const displayName = user.displayName ?? "User";
    const avatarNamedColor = getAvatarColor(displayName);
    const avatarColorBackground =
        getAvatarBackgroundColorStyle(avatarNamedColor);
    return (
        <div
            key={user.userId}
            style={{
                pointerEvents: "none",
                color: "transparent",
                height: "100%",
                position: "absolute",
                bottom: 0,
                top: 0,
                right: 0,
                left: 0,
                whiteSpace: "pre-wrap",
            }}
            aria-hidden
            role="presentation"
            className={textareaRef.current.className}
        >
            <span>{beforeSelectionText}</span>
            <mark
                style={{
                    color: "transparent",
                    opacity: 0.4,
                    backgroundColor: avatarColorBackground,
                }}
            >
                {selectionText}
            </mark>
            <span className="cursor-span">
                <div
                    className="cursor"
                    style={{
                        // @ts-ignore
                        "--cursor-height": tokens.lineHeightBase400,
                    }}
                >
                    <div
                        className="cursor-inner"
                        style={{
                            // @ts-ignore
                            "--cursor-color": avatarColorBackground,
                        }}
                    />
                </div>
                <div
                    className="cursor-avatar-dot"
                    style={{
                        // @ts-ignore
                        "--cursor-color": avatarColorBackground,
                    }}
                />
                <div
                    className={
                        showAvatar ? "cursor-avatar" : "cursor-avatar hidden"
                    }
                >
                    <Avatar
                        name={displayName}
                        color={avatarNamedColor}
                        size={16}
                        style={{
                            verticalAlign: "top",
                        }}
                    />
                </div>
            </span>
            {afterSelectionText}
        </div>
    );
};
