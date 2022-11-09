import { Image, Button } from "@fluentui/react-components";

export const InkingControlButton = ({
    tool,
    selectedTool,
    isEnabled,
    imageAsset,
    onSelectTool,
}) => {
    return (
        <Button
            appearance="transparent"
            style={{
                borderBottom:
                    selectedTool === tool && isEnabled
                        ? "2px solid red"
                        : "2px solid transparent",
                width: "32px",
                minWidth: "32px",
            }}
            onClick={() => {
                onSelectTool(tool);
            }}
        >
            <Image src={imageAsset} width={24} height={24} />
        </Button>
    );
};
