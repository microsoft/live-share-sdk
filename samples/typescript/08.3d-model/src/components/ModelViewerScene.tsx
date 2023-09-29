/* eslint-disable react/no-unknown-property */
import { FC, RefObject, Suspense } from "react";
import {
    Nullable,
    PickingInfo,
    Scene as BabyScene,
    ArcRotateCamera,
} from "@babylonjs/core";
import { Engine, Scene, Model } from "react-babylonjs";
import "@babylonjs/loaders/glTF";
import { Vector3, Color4 } from "@babylonjs/core/Maths/math";
import { tokens } from "@fluentui/react-theme";
import ErrorBoundary from "./ErrorBoundary";

interface IModelSceneViewerProps {
    cameraRef: RefObject<ArcRotateCamera>;
    modelFileName: string;
    onReadyObservable: (scene: any) => void;
}

const POINT_LIGHT_POSITION = new Vector3(0, 50, 0);
const CAMERA_TARGET = new Vector3(0, 0, 0);
const CAMERA_ALPHA = Math.PI / 2;
const CAMERA_BETA = Math.PI / 2;
const HEMISPHERIC_LIGHT_DIRECTION = Vector3.Up();

/**
 * Babylon JS 3D viewer
 */
export const ModelViewerScene: FC<IModelSceneViewerProps> = ({
    cameraRef,
    modelFileName,
    onReadyObservable,
}) => {
    //
    return (
        <Engine antialias adaptToDeviceRatio canvasId="babylonJS">
            <Scene
                clearColor={Color4.FromHexString(
                    tokens.colorNeutralBackground2
                )}
                onReadyObservable={onReadyObservable}
            >
                <pointLight name="omni" position={POINT_LIGHT_POSITION} />
                <arcRotateCamera
                    name="arc"
                    target={CAMERA_TARGET}
                    alpha={CAMERA_ALPHA}
                    beta={CAMERA_BETA}
                    radius={150}
                    wheelPrecision={50} // Adjust this to make zoom faster/slower
                    panningSensibility={100} // Adjust this to make panning faster/slower
                    ref={cameraRef}
                />
                <hemisphericLight
                    name="light1"
                    intensity={0.7}
                    direction={HEMISPHERIC_LIGHT_DIRECTION}
                />
                <ErrorBoundary fallback={<></>}>
                    <Suspense fallback={<></>}>
                        <Model
                            name={modelFileName}
                            rootUrl={"/"}
                            sceneFilename={modelFileName}
                        />
                    </Suspense>
                </ErrorBoundary>
            </Scene>
        </Engine>
    );
};
