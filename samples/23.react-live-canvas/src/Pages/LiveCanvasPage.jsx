import { TeamsFluidClient } from "@microsoft/live-share";
import { LiveCanvas } from "@microsoft/live-share-canvas";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils";
import { useEffect, useState, useRef } from "react";
import { useLiveCanvas } from "../utils/useLiveCanvas";


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
  const [liveCanvas, setliveCanvas] = useState(undefined);
  const divRef = useRef();
  const {
    setToPen,
    setToEraser,
    setToHighlighter,
    setToLaserPointer,
    setToBlackBrush,
    setToBlueBrush,
    setToRedBrush,
    clearCanvas,
  } = useLiveCanvas(liveCanvas, divRef.current);

  const initialize = async () => {
    const client = new TeamsFluidClient(clientOptions);
    const { container } = await client.joinContainer(containerSchema);
    setliveCanvas(container.initialObjects.liveCanvas);
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
        <button onClick={clearCanvas}>Clear</button>
        <button onClick={setToEraser}>Eraser</button>
        <button onClick={setToPen}>Pen</button>
        <button onClick={setToHighlighter}>Highlighter</button>
        <button onClick={setToLaserPointer}>Laser Pointer</button>
        <button onClick={setToBlueBrush}>Blue brush</button>
        <button onClick={setToBlackBrush}>Black brush</button>
        <button onClick={setToRedBrush}>Red brush</button>
      </div>
    </>
  );
}
