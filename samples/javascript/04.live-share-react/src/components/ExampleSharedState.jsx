import { useSharedState } from "@microsoft/live-share-react";

export const ExampleSharedState = () => {
    const [counterValue, setCounterValue] = useSharedState("counter-id", 0);
    const [checkboxValue, setCheckboxValue] = useSharedState(
        "checkbox-id",
        false
    );

    return (
        <>
            <div style={{ padding: "12px 8px" }}>
                <h2>{"Click the button to iterate the counter"}</h2>
                <button
                    onClick={() => {
                        setCounterValue(counterValue + 1);
                    }}
                >
                    {"+1"}
                </button>
                <h1 style={{ color: "red" }}>{counterValue}</h1>
                <input
                    type="checkbox"
                    id="accept"
                    name="accept"
                    checked={checkboxValue}
                    onChange={() => {
                        setCheckboxValue(!checkboxValue);
                    }}
                />
                <label htmlFor="accept">{"Checked"}</label>
            </div>
        </>
    );
};
