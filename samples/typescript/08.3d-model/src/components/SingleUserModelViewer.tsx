import { FC, useRef, useState, useCallback, useEffect } from "react";
import { ModelViewerScene } from "./ModelViewerScene";
import {
    Nullable,
    Scene as BabyScene,
    ArcRotateCamera,
    PickingInfo,
} from "@babylonjs/core";
import { IPointerEvent } from "@babylonjs/core/Events";
import { HexColorPicker } from "react-colorful";
import { Color3 } from "@babylonjs/core/Maths/math";
import { PBRMaterial } from "@babylonjs/core/Materials";
import { FlexColumn } from "./flex";

export const SingleUserModelViewer: FC = () => {
    // Babylon scene reference
    const sceneRef = useRef<Nullable<BabyScene>>(null);
    // Babylon arc rotation camera reference
    const cameraRef = useRef<ArcRotateCamera>(null);
    /**
     * Selected material for the color picker UI
     */
    const [selectedMaterialName, setSelectedMaterialName] = useState<
        string | null
    >(null);
    /**
     * Colors map
     */
    const [colorsMap] = useState<Map<string, string>>(new Map());

    /**
     * Callback for when the local user selected a new color to apply to the 3D model
     */
    const onChangeColor = useCallback(
        (value: string) => {
            if (!selectedMaterialName) return;
            if (!sceneRef.current) return;
            try {
                colorsMap.set(selectedMaterialName, value);
                const material =
                    sceneRef.current.getMaterialByName(selectedMaterialName);
                if (material && material instanceof PBRMaterial) {
                    const color = Color3.FromHexString(value);
                    material.albedoColor = color;
                }
            } catch (err: any) {
                console.error(err);
            }
        },
        [colorsMap, selectedMaterialName]
    );

    /**
     * Callback for when the user clicks on the scene
     */
    const handlePointerDown = useCallback(
        (evt: IPointerEvent) => {
            if (!sceneRef.current) return;

            const pickResult: Nullable<PickingInfo> = sceneRef.current.pick(
                evt.clientX,
                evt.clientY
            );

            if (pickResult && pickResult.hit && pickResult.pickedMesh) {
                const mesh = pickResult.pickedMesh;
                if (!mesh.material) return;
                // When the user clicks on a specific material in our object, we set it as selected to show the color picker
                setSelectedMaterialName(mesh.material.name);
                return;
            }
            if (!selectedMaterialName) return;
            setSelectedMaterialName(null);
        },
        [selectedMaterialName]
    );

    /**
     * Setup the onPointerDown event listener
     */
    useEffect(() => {
        if (sceneRef.current) {
            sceneRef.current.onPointerDown = handlePointerDown;
        }
        return () => {
            if (sceneRef.current) {
                sceneRef.current.onPointerDown = undefined;
            }
        };
    }, [handlePointerDown]);

    const onReady = useCallback(
        (scene: any) => {
            sceneRef.current = scene;
            if (!scene) return;
            scene.onPointerDown = handlePointerDown;
        },
        [handlePointerDown]
    );

    return (
        <FlexColumn fill="view">
            <ModelViewerScene
                cameraRef={cameraRef}
                modelFileName="plane.glb"
                onReadyObservable={onReady}
            />
            {!!selectedMaterialName && (
                <HexColorPicker
                    color={
                        selectedMaterialName
                            ? colorsMap.get(selectedMaterialName)
                            : undefined
                    }
                    onChange={onChangeColor}
                    style={{
                        position: "absolute",
                        top: "72px",
                        right: "24px",
                        zIndex: 1,
                    }}
                />
            )}
        </FlexColumn>
    );
};
