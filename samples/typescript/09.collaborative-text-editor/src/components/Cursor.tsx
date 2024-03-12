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
    const [hover, setHover] = useState(false);
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
    /**
     * TODO: this method has an edge case where cursors near the start of a line after a line break
     * may cause the letters "cut off" by the cursor to appear on the previous line. This text is transparent,
     * so it will cause the cursor to appear in the incorrect position in this case.
     *
     * A more accurate and sophisticated approach would be to calculate the absolute position of the text virtually
     * and render based on that, without creating transparent text that isn't doing anything. This would have accessibility
     * benefits as well, since it wouldn't need to be hidden from the screen reader.
     *
     * For now, this edge case is deemed acceptable for this example, but in production we recommend a more robust solution
     * that meets your projects requirements.
     */
    return (
        <div
            key={user.userId}
            aria-hidden
            role="presentation"
            className={`${textareaRef.current.className} cursor-container`}
        >
            {beforeSelectionText}
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
                    onMouseEnter={() => {
                        setHover(true);
                    }}
                    onMouseLeave={() => {
                        setHover(false);
                    }}
                >
                    <div
                        className="cursor-inner"
                        style={{
                            // @ts-ignore
                            "--cursor-color": avatarColorBackground,
                        }}
                    />
                    <div
                        className="cursor-avatar-dot"
                        style={{
                            // @ts-ignore
                            "--cursor-color": avatarColorBackground,
                        }}
                    />
                    <div
                        className={
                            showAvatar
                                ? "cursor-avatar"
                                : "cursor-avatar hidden"
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
                </div>
                <div
                    className={hover ? "cursor-hover" : "cursor-hover hidden"}
                    style={{
                        // @ts-ignore
                        "--cursor-color": avatarColorBackground,
                    }}
                >
                    {user.displayName}
                </div>
            </span>
            {afterSelectionText}
        </div>
    );
};