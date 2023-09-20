import { Button, tokens } from "@fluentui/react-components";
import { FC, MouseEventHandler, ReactNode } from "react";

interface IFollowModeSmallButtonProps {
    children?: ReactNode;
    onClick?: MouseEventHandler;
}

export const FollowModeSmallButton: FC<IFollowModeSmallButtonProps> = ({
    children,
    onClick,
}) => {
    return (
        <Button
            appearance="transparent"
            size="small"
            style={{
                color: tokens.colorNeutralForegroundOnBrand,
                fontWeight: 600,
            }}
            onClick={onClick}
        >
            {children}
        </Button>
    );
};
