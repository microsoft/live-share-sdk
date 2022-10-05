import { TeamsFluidClient } from "@microsoft/live-share";
import { LiveCanvas } from "@microsoft/live-share-canvas";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { useEffect, useState, useRef } from "react";
import { useLiveCanvas } from "./useLiveCanvas";


const containerSchema = {
  initialObjects: {
      liveCanvas: LiveCanvas
  }
};

const clientOptions = {
  connection: {
      type: "local",
      tokenProvider: new InsecureTokenProvider("", { id: "123" }),
      endpoint: "http://localhost:7070"
  }
};

export const LiveCanvasPage = () => {
  const [container, setContainer] = useState(undefined);
  const divRef = useRef();
  const { handleBlackPenClick, handleBluePenClick, handleClearClick } = useLiveCanvas(container, divRef.current)

  const initialize = async () => {
    const client = new TeamsFluidClient(clientOptions);
    const { container } = await client.joinContainer(containerSchema);
    setContainer(container);
  };

  useEffect(() => {
    initialize();
  }, []);

  return (
    <>
      <div id="inkingRoot">
        <div id="inkingHost" ref={divRef}></div>
      </div>
      <div>
        <button onClick={handleBlackPenClick}>Black brush</button>
        <button onClick={handleBluePenClick}>Blue brush</button>
        <button onClick={handleClearClick}>Clear</button>
      </div>
    </>
  );
}
