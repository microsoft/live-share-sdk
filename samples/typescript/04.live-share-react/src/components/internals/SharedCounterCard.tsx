import { useLiveState, useSharedState } from "@microsoft/live-share-react";
import { FC } from "react";
import { ISharedCardValue } from "../../interfaces/interfaces";

interface ISharedCounterCardProps {
    card: ISharedCardValue;
    onDelete: (key: string) => void;
}

export const SharedCounterCard: FC<ISharedCounterCardProps> = ({
    card,
    onDelete,
}) => {
    const [count, setCount, disposeCount] = useSharedState<number>(
        `card-count:${card.id}`,
        0
    );
    const [liveCount, setLiveCount] = useLiveState<number>(
        `live-card-count:${card.id}`,
        0
    );
    return (
        <div className="card">
            <h3>{card.title}</h3>
            <p>{card.id}</p>
            <div className="flex row vAlign" style={{ marginBottom: "12px" }}>
                <button
                    style={{ marginRight: "12px" }}
                    onClick={() => {
                        setCount((prevCount) => prevCount + 1);
                    }}
                >
                    {"+1"}
                </button>
                <span
                    style={{
                        fontWeight: 400,
                        fontSize: "1.2em",
                        lineHeight: "1.1",
                    }}
                >{`shared count: ${count}`}</span>
            </div>
            <div className="flex row vAlign" style={{ marginBottom: "12px" }}>
                <button
                    style={{ marginRight: "12px" }}
                    onClick={() => {
                        setLiveCount((prevCount) => prevCount + 1);
                    }}
                >
                    {"+1"}
                </button>
                <span
                    style={{
                        fontWeight: 400,
                        fontSize: "1.2em",
                        lineHeight: "1.1",
                    }}
                >{`live count: ${liveCount}`}</span>
            </div>
            <button
                onClick={() => {
                    onDelete(card.id);
                    disposeCount();
                }}
            >
                {"Delete"}
            </button>
        </div>
    );
};
