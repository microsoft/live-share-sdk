/* eslint-disable react/no-unknown-property */
import { FollowModeType, TestLiveShareHost } from "@microsoft/live-share";
import {
    LiveShareProvider,
    useLiveFollowMode,
    useSharedMap,
} from "@microsoft/live-share-react";
import { LiveShareHost, UserMeetingRole } from "@microsoft/teams-js";
import { inTeams } from "../utils/inTeams";
import { FC, useState, useEffect, useRef, Suspense, useCallback } from "react";
import { Engine, Scene, Model } from "react-babylonjs";
import { Vector3, Color3, Color4 } from "@babylonjs/core/Maths/math";
import "@babylonjs/loaders/glTF";
import ErrorBoundary from "../components/ErrorBoundary";
import {
    Nullable,
    PickingInfo,
    Scene as BabyScene,
    ArcRotateCamera,
} from "@babylonjs/core";
import { PBRMaterial } from "@babylonjs/core/Materials";
import { IPointerEvent } from "@babylonjs/core/Events";
import { HexColorPicker } from "react-colorful";
import { debounce } from "lodash";
import { Button, Text, tokens } from "@fluentui/react-components";
import {
    DecorativeOutline,
    FlexColumn,
    FlexRow,
    LiveAvatars,
    FollowModeInfoText,
    FollowModeSmallButton,
} from "../components";
import { vectorsAreRoughlyEqual } from "../utils/vector-utils";
import { LiveCanvasOverlay } from "../components/LiveCanvasOverlay";
import { LiveSessionControls } from "../components/LiveSessionControls";
const IN_TEAMS = inTeams();

export const TabContent: FC = () => {
    const [host] = useState(
        IN_TEAMS ? LiveShareHost.create() : TestLiveShareHost.create()
    );
    return (
        <LiveShareProvider joinOnLoad host={host}>
            <BabylonScene />
        </LiveShareProvider>
    );
};

const DEBOUNCE_SEND_CAMERA_UPDATES_INTERVAL = 100;
export interface ICustomFollowData {
    cameraPosition: {
        x: number;
        y: number;
        z: number;
    };
}

export const ALLOWED_ROLES = [
    UserMeetingRole.organizer,
    UserMeetingRole.presenter,
];

const BabylonScene: FC = () => {
    /**
     * Synchronized SharedMap for the color values that correspond to a material in the loaded .glb file
     */
    const {
        map: colorsMap,
        setEntry: setMaterialColor,
        sharedMap: sharedColorsMap,
    } = useSharedMap("COLORS");
    /**
     * Selected material for the color picker UI
     */
    const [selectedMaterialName, setSelectedMaterialName] = useState<
        string | null
    >(null);
    /**
     * Following state to track which camera position to display
     */
    const {
        allUsers,
        state: remoteCameraState,
        update: updateUserCameraState,
        startPresenting,
        stopPresenting,
        followUser,
        stopFollowing,
        beginSuspension,
        endSuspension,
    } = useLiveFollowMode<ICustomFollowData | undefined>(
        "FOLLOW_MODE",
        undefined,
        ALLOWED_ROLES
    );

    const sceneRef = useRef<Nullable<BabyScene>>(null);
    const cameraRef = useRef<ArcRotateCamera>(null);
    const pointerElementRef = useRef<HTMLDivElement>(null);
    /**
     * Expected remote positions from following user (queue).
     * Used to help determine when a camera position update in `onViewMatrixChangedObservable` was triggered via remote update.
     */
    const expectedPositionUpdatesRef = useRef<Vector3[]>([]);

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
                if (mesh.material) {
                    // When the user clicks on a specific material in our object, we set it as selected to show the color picker
                    setSelectedMaterialName(mesh.material.name);
                }
            } else {
                if (!selectedMaterialName) return;
                setSelectedMaterialName(null);
            }
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

    /**
     * Callback to update the material colors for the latest remote values
     */
    const applyRemoteColors = useCallback(() => {
        colorsMap.forEach((value, key) => {
            if (!sceneRef.current) return;
            const material = sceneRef.current.getMaterialByName(key);
            if (material && material instanceof PBRMaterial) {
                const color = Color3.FromHexString(value);
                material.albedoColor = color;
            }
        });
    }, [colorsMap]);

    /**
     * When the synchronized colorsMap value changes we apply it to our scene.
     */
    useEffect(() => {
        applyRemoteColors();
    }, [applyRemoteColors]);

    /**
     * Send camera position for local user to remote
     */
    const sendCameraPos = useCallback(() => {
        if (!cameraRef.current) return;
        const cameraPosition = cameraRef.current.position;
        updateUserCameraState({
            cameraPosition: {
                x: cameraPosition.x,
                y: cameraPosition.y,
                z: cameraPosition.z,
            },
        });
    }, [updateUserCameraState]);

    /**
     * Debounce sending camera position for optimal performance
     */
    const debouncedSendCameraPos = useCallback(
        debounce(sendCameraPos, DEBOUNCE_SEND_CAMERA_UPDATES_INTERVAL),
        [sendCameraPos]
    );

    /**
     * debouncedSendCameraPos cleanup
     */
    useEffect(() => {
        // Cancel previous debounce calls during useEffect cleanup.
        return debouncedSendCameraPos.cancel;
    }, [debouncedSendCameraPos]);

    /**
     * Callback to snap camera position to presenting user when the remote value changes
     */
    const snapCameraIfFollowingUser = useCallback(() => {
        if (!remoteCameraState) return;
        if (
            [
                FollowModeType.local,
                FollowModeType.activePresenter,
                FollowModeType.suspendFollowPresenter,
                FollowModeType.suspendFollowUser,
            ].includes(remoteCameraState.type)
        )
            return;
        if (!remoteCameraState.value) return;
        if (!cameraRef.current) return;
        const remoteCameraPos = new Vector3(
            remoteCameraState.value.cameraPosition.x,
            remoteCameraState.value.cameraPosition.y,
            remoteCameraState.value.cameraPosition.z
        );
        if (vectorsAreRoughlyEqual(cameraRef.current.position, remoteCameraPos))
            return;
        expectedPositionUpdatesRef.current.push(remoteCameraPos);
        cameraRef.current.setPosition(remoteCameraPos);
    }, [remoteCameraState]);

    /**
     * Update camera position when following user's presence changes
     */
    useEffect(() => {
        snapCameraIfFollowingUser();
    }, [snapCameraIfFollowingUser]);

    /**
     * Callback when the arcLightCamera position changes
     */
    const onCameraViewMatrixChanged = useCallback(
        (evt: any) => {
            debouncedSendCameraPos();
            // Check if the value is from remote value
            const isFromRemoteValue =
                expectedPositionUpdatesRef.current.length > 0
                    ? vectorsAreRoughlyEqual(
                          expectedPositionUpdatesRef.current[0],
                          evt.position
                      )
                    : false;
            if (isFromRemoteValue) {
                // Validated position was from `LivePresence` for presenting user, remove expected position from queue
                expectedPositionUpdatesRef.current =
                    expectedPositionUpdatesRef.current.slice(1);
                return;
            }

            if (
                !remoteCameraState ||
                [
                    FollowModeType.local,
                    FollowModeType.activePresenter,
                    FollowModeType.suspendFollowPresenter,
                    FollowModeType.suspendFollowUser,
                ].includes(remoteCameraState.type)
            )
                return;
            const currentRemotePos = remoteCameraState.value
                ? new Vector3(
                      remoteCameraState.value.cameraPosition.x,
                      remoteCameraState.value.cameraPosition.y,
                      remoteCameraState.value.cameraPosition.z
                  )
                : undefined;
            if (
                !currentRemotePos ||
                vectorsAreRoughlyEqual(currentRemotePos, evt.position)
            )
                return;
            beginSuspension();
        },
        [debouncedSendCameraPos, remoteCameraState, beginSuspension]
    );

    /**
     * Set/update the camera view matrix change listener
     */
    useEffect(() => {
        if (!cameraRef.current) return;
        // Add an observable
        cameraRef.current.onViewMatrixChangedObservable.add(
            onCameraViewMatrixChanged
        );
        // Clear observables on unmount
        return () => {
            cameraRef.current?.onViewMatrixChangedObservable.clear();
        };
    }, [onCameraViewMatrixChanged]);

    const liveCanvasActive = remoteCameraState
        ? [
              FollowModeType.followPresenter,
              FollowModeType.followUser,
              FollowModeType.activePresenter,
          ].includes(remoteCameraState.type) ||
          (remoteCameraState.type === FollowModeType.local &&
              remoteCameraState.otherUsersCount > 0)
        : false;

    return (
        <>
            {!!remoteCameraState && (
                <FlexRow
                    spaceBetween
                    vAlign="center"
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        paddingTop: "12px",
                        paddingLeft: "20px",
                        paddingRight: "20px",
                        paddingBottom: "12px",
                        backgroundColor: tokens.colorNeutralBackground4,
                    }}
                >
                    <FlexRow
                        style={{
                            width: "132px",
                        }}
                    />
                    <LiveAvatars
                        allUsers={allUsers}
                        remoteCameraState={remoteCameraState}
                        onFollowUser={followUser}
                    />
                    <FlexRow
                        gap="small"
                        vAlign="center"
                        hAlign="end"
                        style={{
                            width: "132px",
                        }}
                    >
                        {remoteCameraState.type === FollowModeType.local && (
                            <Button
                                appearance="primary"
                                onClick={startPresenting}
                            >
                                {"Start presenting"}
                            </Button>
                        )}
                        {remoteCameraState.type ===
                            FollowModeType.activePresenter && (
                            <Button
                                appearance="primary"
                                onClick={stopPresenting}
                            >
                                {"Stop presenting"}
                            </Button>
                        )}
                        {(remoteCameraState.type ===
                            FollowModeType.suspendFollowUser ||
                            remoteCameraState.type ===
                                FollowModeType.followUser) && (
                            <Button
                                appearance="primary"
                                onClick={stopFollowing}
                            >
                                {"Stop following"}
                            </Button>
                        )}
                        {(remoteCameraState.type ===
                            FollowModeType.followPresenter ||
                            remoteCameraState.type ===
                                FollowModeType.suspendFollowPresenter) && (
                            <Button
                                appearance="secondary"
                                onClick={startPresenting}
                            >
                                {"Take control"}
                            </Button>
                        )}
                    </FlexRow>
                </FlexRow>
            )}
            <FlexColumn fill="view" ref={pointerElementRef}>
                <Engine antialias adaptToDeviceRatio canvasId="babylonJS">
                    <Scene
                        clearColor={Color4.FromHexString(
                            tokens.colorNeutralBackground2
                        )}
                        onReadyObservable={(scene: any) => {
                            sceneRef.current = scene;
                            if (sceneRef.current) {
                                sceneRef.current.onPointerDown =
                                    handlePointerDown;
                                applyRemoteColors();
                                snapCameraIfFollowingUser();
                            }
                        }}
                    >
                        <pointLight
                            name="omni"
                            position={new Vector3(0, 50, 0)}
                        />
                        <arcRotateCamera
                            name="arc"
                            target={new Vector3(0, 0, 0)}
                            alpha={Math.PI / 2}
                            beta={Math.PI / 2}
                            radius={150}
                            wheelPrecision={50} // Adjust this to make zoom faster/slower
                            panningSensibility={100} // Adjust this to make panning faster/slower
                            ref={cameraRef}
                        />
                        <hemisphericLight
                            name="light1"
                            intensity={0.7}
                            direction={Vector3.Up()}
                        />
                        <ErrorBoundary fallback={<></>}>
                            <Suspense fallback={<></>}>
                                <Model
                                    name="plane.glb"
                                    rootUrl={"/"}
                                    sceneFilename={"plane.glb"}
                                />
                            </Suspense>
                        </ErrorBoundary>
                    </Scene>
                </Engine>
            </FlexColumn>
            {/* Decorative border while following / presenting */}
            {((!!remoteCameraState &&
                [
                    FollowModeType.activePresenter,
                    FollowModeType.followPresenter,
                    FollowModeType.followUser,
                ].includes(remoteCameraState.type)) ||
                (remoteCameraState &&
                    remoteCameraState.type === FollowModeType.local &&
                    remoteCameraState.otherUsersCount > 0)) && (
                <DecorativeOutline
                    borderColor={
                        remoteCameraState.type ===
                            FollowModeType.activePresenter ||
                        (remoteCameraState.type === FollowModeType.local &&
                            remoteCameraState.otherUsersCount > 0)
                            ? tokens.colorPaletteRedBackground3
                            : tokens.colorPaletteBlueBorderActive
                    }
                />
            )}
            {!!sharedColorsMap && !!selectedMaterialName && (
                <div
                    style={{
                        position: "absolute",
                        top: "72px",
                        right: "24px",
                    }}
                >
                    <HexColorPicker
                        color={
                            selectedMaterialName
                                ? colorsMap.get(selectedMaterialName)
                                : undefined
                        }
                        onChange={(value) => {
                            if (!selectedMaterialName) return;
                            try {
                                setMaterialColor(selectedMaterialName, value);
                                if (!sceneRef.current) return;
                                const material =
                                    sceneRef.current.getMaterialByName(
                                        selectedMaterialName
                                    );
                                if (
                                    material &&
                                    material instanceof PBRMaterial
                                ) {
                                    const color = Color3.FromHexString(value);
                                    material.albedoColor = color;
                                }
                            } catch (err: any) {
                                console.error(err);
                            }
                        }}
                    />
                </div>
            )}
            {/* LiveCanvas for inking */}
            {remoteCameraState?.followingUserId &&
                remoteCameraState.value &&
                liveCanvasActive && (
                    <LiveCanvasOverlay
                        pointerElementRef={pointerElementRef}
                        followingUserId={remoteCameraState.followingUserId}
                        zPosition={remoteCameraState.value.cameraPosition.z}
                    />
                )}
            {/* Follow mode information / actions */}
            {!!remoteCameraState &&
                (remoteCameraState.type !== FollowModeType.local ||
                    remoteCameraState.otherUsersCount > 0) && (
                    <FlexRow
                        hAlign="center"
                        vAlign="center"
                        style={{
                            position: "absolute",
                            top: 72,
                            left: "50%",
                            transform: "translate(-50% , 0%)",
                            "-webkit-transform": "translate(-50%, 0%)",
                            paddingBottom: "4px",
                            paddingTop: "4px",
                            paddingLeft: "16px",
                            paddingRight: "4px",
                            borderRadius: "4px",
                            minHeight: "24px",
                            backgroundColor:
                                remoteCameraState.type ===
                                    FollowModeType.activePresenter ||
                                (remoteCameraState.type ===
                                    FollowModeType.local &&
                                    remoteCameraState.otherUsersCount > 0)
                                    ? tokens.colorPaletteRedBackground3
                                    : tokens.colorPaletteBlueBorderActive,
                        }}
                    >
                        <FollowModeInfoText />
                        {remoteCameraState.type ===
                            FollowModeType.activePresenter && (
                            <FollowModeSmallButton onClick={stopPresenting}>
                                {"STOP"}
                            </FollowModeSmallButton>
                        )}
                        {remoteCameraState.type ===
                            FollowModeType.followUser && (
                            <FollowModeSmallButton onClick={stopFollowing}>
                                {"STOP"}
                            </FollowModeSmallButton>
                        )}
                        {remoteCameraState.type ===
                            FollowModeType.suspendFollowPresenter && (
                            <FollowModeSmallButton onClick={endSuspension}>
                                {"FOLLOW"}
                            </FollowModeSmallButton>
                        )}
                        {remoteCameraState.type ===
                            FollowModeType.suspendFollowUser && (
                            <FollowModeSmallButton onClick={endSuspension}>
                                {"RESUME"}
                            </FollowModeSmallButton>
                        )}
                    </FlexRow>
                )}
        </>
    );
};
