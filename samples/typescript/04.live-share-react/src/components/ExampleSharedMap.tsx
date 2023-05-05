import { useSharedMap } from "@microsoft/live-share-react";
import { v4 as uuid } from "uuid";
import { SharedCounterCard } from "./internals";
import { ISharedCardValue } from "../interfaces/interfaces";
import { FC } from "react";

export const EXAMPLE_SHARED_MAP_KEY = "CUSTOM-CARDS-MAP";

export const ExampleSharedMap: FC = () => {
    const { map, setEntry, deleteEntry } = useSharedMap<ISharedCardValue>(EXAMPLE_SHARED_MAP_KEY);

    return (
        <div>
            <div className="flex row" style={{ padding: "12px 12px" }}>
                <h2>{"Cards"}</h2>
                <button
                    onClick={() => {
                        const id = uuid();
                        setEntry(id, {
                            id,
                            title: "Custom Card",
                        });
                    }}
                >
                    {"+ Add card"}
                </button>
            </div>
            <div className="flex wrap row hAlign">
                {[...map.values()].map((cardValue) => (
                    <SharedCounterCard
                        key={cardValue.id}
                        card={cardValue}
                        onDelete={deleteEntry}
                    />
                ))}
            </div>
        </div>
    );
};
