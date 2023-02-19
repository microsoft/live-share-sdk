import { Button } from "@fluentui/react-components";
import { FC, useEffect, useState } from "react";

interface IRecommendedIdeaButtonProps {
    ideaText: string;
    onAddRecommendedIdea: (ideaText: string) => void;
}

export const RecommendedIdeaButton: FC<IRecommendedIdeaButtonProps> = (
    props
) => {
    const { ideaText, onAddRecommendedIdea } = props;
    const [haveClicked, setHaveClicked] = useState(false);

    useEffect(() => {
        if (haveClicked) {
            setHaveClicked(false);
        }
    }, [ideaText]);

    return (
        <Button
            appearance="outline"
            size="small"
            disabled={haveClicked}
            onClick={() => {
                if (haveClicked) return;
                setHaveClicked(true);
                onAddRecommendedIdea(ideaText);
            }}
            style={{
                marginTop: "4px",
                marginBottom: "4px",
            }}
        >
            {ideaText}
        </Button>
    );
};
