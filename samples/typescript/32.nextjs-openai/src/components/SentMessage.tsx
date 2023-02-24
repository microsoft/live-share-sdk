import { Avatar, Body1, Caption1 } from "@fluentui/react-components";
import { FC } from "react";
import { FlexColumn, FlexRow } from "./flex";

interface ISentMessageProps {
    isGPT: boolean;
    senderName: string;
    message: string;
}

export const SentMessage: FC<ISentMessageProps> = (props) => {
    const { senderName, message } = props;
    return (
        <FlexColumn marginSpacer>
            <FlexRow vAlignCenter marginSpacer>
                <Avatar name={senderName} color="colorful" size={20} />
                <Caption1>{senderName}</Caption1>
            </FlexRow>
            <Body1 style={{ whiteSpace: "pre-wrap" }}>{message.trim()}</Body1>
        </FlexColumn>
    );
};
