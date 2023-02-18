import { FC, useEffect, useRef } from "react";

interface IAlwaysScrollToBottomProps {
    messagesLength: number;
}

export const AlwaysScrollToBottom: FC<IAlwaysScrollToBottomProps> = (props) => {
    const { messagesLength } = props;
    const elementRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => elementRef.current?.scrollIntoView(), [messagesLength]);
    return <div ref={elementRef} />;
};
