/* eslint-disable react/no-unknown-property */
import { FollowModeType, TestLiveShareHost } from "@microsoft/live-share";
import {
    LiveShareProvider,
    useLiveFollowMode,
    useLiveShareContext,
    useSharedMap,
} from "@microsoft/live-share-react";
import { LiveShareHost, UserMeetingRole } from "@microsoft/teams-js";
import { inTeams } from "../utils/inTeams";
import { FC, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { Vector3, Color3 } from "@babylonjs/core/Maths/math";
import "@babylonjs/loaders/glTF";
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
import { Button, Spinner, Text, tokens } from "@fluentui/react-components";
import {
    DecorativeOutline,
    FlexColumn,
    LiveAvatars,
    FollowModeInfoText,
    FollowModeSmallButton,
    FollowModeInfoBar,
    TopHeaderBar,
    ModelViewerScene,
} from "../components";
import { vectorsAreRoughlyEqual } from "../utils/vector-utils";
import { LiveCanvasOverlay } from "../components/LiveCanvasOverlay";

const IN_TEAMS = inTeams();

export const TabContent: FC = () => {
    const [host] = useState(
        IN_TEAMS ? LiveShareHost.create() : TestLiveShareHost.create()
    );
    return (
        <LiveShareProvider joinOnLoad host={host}>
            <LoadingErrorWrapper>
                <LiveObjectViewer />
            </LoadingErrorWrapper>
        </LiveShareProvider>
    );
};

export const LoadingErrorWrapper: FC<{
    children?: ReactNode;
}> = ({ children }) => {
    const { joined, joinError } = useLiveShareContext();
    if (joinError) {
        return <Text>{joinError?.message}</Text>;
    }
    if (!joined) {
        return (
            <FlexColumn fill="view" vAlign="center" hAlign="center">
                <Spinner />
            </FlexColumn>
        );
    }
    return <>{children}</>;
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

/**
 * Component that uses several Live Share features for viewing a Babylon.js 3D model collaboratively.
 * useSharedMap is used to synchronize the color of the model.
 * useLiveFollowMode is used to enable following/presenting.
 * useLiveCanvas is used to enable synchronized pen/highlighter/cursors atop the model when in follow mode.
 */
const LiveObjectViewer: FC = () => {
    // Babylon scene reference
    const sceneRef = useRef<Nullable<BabyScene>>(null);
    // Babylon arc rotation camera reference
    const cameraRef = useRef<ArcRotateCamera>(null);
    // Pointer reference for mouse inputs, which is used so cursors continue working while interacting with the 3D model
    const pointerElementRef = useRef<HTMLDivElement>(null);

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
        allUsers, // List of users with info about who they are following and their custom state value.
        state: remoteCameraState, // The relevant state based on who is presenting / the user is following
        update: updateUserCameraState, // Update the local user's state value
        startPresenting, // Start presenting / take control
        stopPresenting, // Release control
        followUser, // Start following a specific user
        stopFollowing, // Stop following the currently followed user
        beginSuspension, // Temporarily suspend following the presenter / followed user
        endSuspension, // Resume following the presenter / followed user
    } = useLiveFollowMode<ICustomFollowData>(
        "FOLLOW_MODE", // unique key for DDS
        // Initial value, can either be the value itself or a callback to get the value.
        () => {
            // We use a callback because the camera position may change by the time LiveFollowMode is initialized
            return {
                cameraPosition: {
                    x: cameraRef.current?.position.x ?? 0,
                    y: cameraRef.current?.position.y ?? 0,
                    z: cameraRef.current?.position.z ?? 0,
                },
            };
        }, // default value
        ALLOWED_ROLES // roles who can "take control" of presenting
    );

    /**
     * Expected remote positions from following user (queue).
     * Used to help determine when a camera position update in `onViewMatrixChangedObservable` was triggered via remote update.
     */
    const expectedPositionUpdatesRef = useRef<Vector3[]>([]);

    /**
     * Callback for when the local user selected a new color to apply to the 3D model
     */
    const onChangeColor = useCallback(
        (value: string) => {
            if (!selectedMaterialName) return;
            if (!sceneRef.current) return;
            try {
                setMaterialColor(selectedMaterialName, value);
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
        [selectedMaterialName]
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
     * Callback that wraps sendCameraPos into a lodash debounce.
     * Debounce sending camera position for optimal performance.
     */
    const debouncedSendCameraPos = useCallback(
        debounce(sendCameraPos, DEBOUNCE_SEND_CAMERA_UPDATES_INTERVAL),
        [sendCameraPos]
    );

    /**
     * debouncedSendCameraPos cleanup on unmount / dependency changes
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
        // We do not need to snap to a remote value when referencing the local user's value
        if (remoteCameraState.isLocalValue) return;
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
            /**
             * This observer does not tell us whether a change happened because we call camera.setPosition() vs. through user input.
             * In this sample, we want to allow users to temporarily "suspend" following a presenter/user.
             * To do this, we try to isolate remote changes from local ones via a `expectedPositionUpdatesRef.current` "queue".
             * We add the value to queue in snapCameraIfFollowingUser, and when this listener picks up a change that matches that value, we remove it.
             * For values not expected from a server, we can then determine whether we should call `startSuspension()`.
             */
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

            if (!remoteCameraState) return;
            // If the remote camera state is a local value, no need to suspend when out of sync
            if (remoteCameraState.isLocalValue) return;
            // Check to see if the local user's camera position is out of sync with remote position
            const currentRemotePos = new Vector3(
                remoteCameraState.value.cameraPosition.x,
                remoteCameraState.value.cameraPosition.y,
                remoteCameraState.value.cameraPosition.z
            );
            if (vectorsAreRoughlyEqual(currentRemotePos, evt.position)) return;
            // The user selected a camera position that is not in sync with the remote position, so we start a new suspension.
            // The user will be able to return in sync with the remote position when `endSuspension` is called.
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

    // Show LiveCanvas overlay and/or decorative overlay while in follow mode
    const followModeActive = remoteCameraState
        ? [
              FollowModeType.followPresenter,
              FollowModeType.followUser,
              FollowModeType.activePresenter,
              FollowModeType.activeFollowers,
          ].includes(remoteCameraState.type)
        : false;

    return (
        <>
            {!!remoteCameraState && (
                <TopHeaderBar
                    right={
                        <>
                            {(remoteCameraState.type === FollowModeType.local ||
                                remoteCameraState.type ===
                                    FollowModeType.activeFollowers) && (
                                <Button
                                    appearance="primary"
                                    onClick={startPresenting}
                                >
                                    {"Spotlight me"}
                                </Button>
                            )}
                            {remoteCameraState.type ===
                                FollowModeType.activePresenter && (
                                <Button
                                    appearance="primary"
                                    onClick={stopPresenting}
                                >
                                    {"Stop spotlight"}
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
                        </>
                    }
                >
                    <LiveAvatars
                        allUsers={allUsers}
                        remoteCameraState={remoteCameraState}
                        onFollowUser={followUser}
                    />
                </TopHeaderBar>
            )}
            <FlexColumn fill="view" ref={pointerElementRef}>
                <ModelViewerScene
                    cameraRef={cameraRef}
                    modelFileName="plane.glb"
                    onReadyObservable={(scene: any) => {
                        sceneRef.current = scene;
                        if (sceneRef.current) {
                            sceneRef.current.onPointerDown = handlePointerDown;
                            applyRemoteColors();
                            snapCameraIfFollowingUser();
                        }
                    }}
                />
            </FlexColumn>
            {/* Decorative border while following / presenting */}
            {!!remoteCameraState && followModeActive && (
                <DecorativeOutline
                    borderColor={
                        remoteCameraState.type ===
                            FollowModeType.activePresenter ||
                        remoteCameraState.type ===
                            FollowModeType.activeFollowers
                            ? tokens.colorPaletteRedBackground3
                            : tokens.colorPaletteBlueBorderActive
                    }
                />
            )}
            {!!sharedColorsMap && !!selectedMaterialName && (
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
                    }}
                />
            )}
            {/* LiveCanvas for inking */}
            {!!remoteCameraState && followModeActive && (
                <LiveCanvasOverlay
                    pointerElementRef={pointerElementRef}
                    followingUserId={remoteCameraState.followingUserId}
                    zPosition={remoteCameraState.value.cameraPosition.z}
                />
            )}
            {/* Follow mode information / actions */}
            {!!remoteCameraState &&
                remoteCameraState.type !== FollowModeType.local && (
                    <FollowModeInfoBar remoteCameraState={remoteCameraState}>
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
                    </FollowModeInfoBar>
                )}
        </>
    );
};
