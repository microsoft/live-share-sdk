import { FC, useEffect, useRef } from "react";

interface IAlwaysScrollToBottomProps {
    messagesLength: number;
}

/**
 * Component that when in a scroll view, will always scroll to the bottom of the scroll view when `messagesLength` changes.
 */
export const AlwaysScrollToBottom: FC<IAlwaysScrollToBottomProps> = (props) => {
    const { messagesLength } = props;
    const elementRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => elementRef.current?.scrollIntoView(), [messagesLength]);
    return <div ref={elementRef} />;
};
