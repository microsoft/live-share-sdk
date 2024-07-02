import { useSharedMap } from "@microsoft/live-share-react";
import { v4 as uuid } from "uuid";
import { SharedCounterCard } from "./internals";
import { ISharedCardValue } from "../interfaces/interfaces";
import { FC } from "react";

export const EXAMPLE_SHARED_MAP_KEY = "CUSTOM-CARDS-MAP";

export const ExampleSharedMap: FC = () => {
    const { sharedMap } = useSharedMap<ISharedCardValue>(
        EXAMPLE_SHARED_MAP_KEY
    );

    if (!sharedMap) {
        return <>Loading...</>;
    }

    return (
        <div>
            <div className="flex row" style={{ padding: "12px 12px" }}>
                <h2>{"Cards"}</h2>
                <button
                    onClick={() => {
                        const id = uuid();
                        sharedMap.set(id, {
                            id,
                            title: "Custom Card",
                        });
                    }}
                >
                    {"+ Add card"}
                </button>
            </div>
            <div className="flex wrap row hAlign">
                {[...sharedMap.values()].map((cardValue) => (
                    <SharedCounterCard
                        key={cardValue.id}
                        card={cardValue}
                        onDelete={sharedMap.delete}
                    />
                ))}
            </div>
        </div>
    );
};
