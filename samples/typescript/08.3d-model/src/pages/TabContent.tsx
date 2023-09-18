/* eslint-disable react/no-unknown-property */
import { TestLiveShareHost } from "@microsoft/live-share";
import {
    LiveShareProvider,
    useLivePresence,
    useLiveState,
    useSharedMap,
} from "@microsoft/live-share-react";
import { LiveShareHost } from "@microsoft/teams-js";
import { inTeams } from "../utils/inTeams";
import { FC, useState, useEffect, useRef, Suspense, useCallback } from "react";
import { Engine, Scene, Model } from "react-babylonjs";
import { Vector3, Color3, Color4 } from "@babylonjs/core/Maths/math";
import "@babylonjs/loaders/glTF";
import plane from "../assets/plane.glb";
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
import { Button, tokens } from "@fluentui/react-components";
import { FlexRow } from "../components";
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
interface ICustomPresenceData {
    cameraPosition: {
        x: number;
        y: number;
        z: number;
    };
}

const BabylonScene: FC = () => {
    /**
     * Synchronized SharedMap for the color values that correspond to a material in the loaded .glb file
     */
    const { map: colorsMap, setEntry: setMaterialColor } =
        useSharedMap("COLORS");
    /**
     * Selected material for the color picker UI
     */
    const [selectedMaterialName, setSelectedMaterialName] = useState<
        string | null
    >(null);
    /**
     * Presence is used to track the current camera positions of each user in the session
     */
    const { localUser, otherUsers, updatePresence } =
        useLivePresence<ICustomPresenceData>("PRESENCE");
    /**
     * User being followed, which defaults to null
     */
    const [followingUserId, setFollowingUserId] = useLiveState<string | null>(
        "FOLLOWING-USER-ID",
        null
    );
    /**
     * Flag for whether local user should be following the presenter.
     * Set to false when user panned the camera while another user is being followed.
     * When false and following a user, a "Sync to presenter" button will be displayed.
     */
    const [followPresenter, setFollowPresenter] = useState<boolean>(true);
    const sceneRef = useRef<Nullable<BabyScene>>(null);
    const cameraRef = useRef<ArcRotateCamera>(null);
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
            console.log(material);
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

    const sendCameraPos = useCallback(() => {
        if (!cameraRef.current) return;
        const cameraPosition = cameraRef.current.position;
        updatePresence({
            cameraPosition: {
                x: cameraPosition.x,
                y: cameraPosition.y,
                z: cameraPosition.z,
            },
        });
    }, [updatePresence]);

    const debouncedSendCameraPos = useCallback(
        debounce(sendCameraPos, DEBOUNCE_SEND_CAMERA_UPDATES_INTERVAL),
        [sendCameraPos]
    );

    /**
     * Cancel debounce on unmount
     */
    useEffect(() => {
        // Cancel previous debounce calls during useEffect cleanup.
        return debouncedSendCameraPos.cancel;
    }, [debouncedSendCameraPos]);

    /**
     * Get the user who is currently presenting's current camera position, or null if N/A.
     */
    const getFollowingUserPosition = useCallback((): Vector3 | null => {
        if (!followingUserId) return null;
        const followingUser = otherUsers.find(
            (user) => user.userId === followingUserId
        );
        if (!followingUser || !followingUser.data) return null;
        return new Vector3(
            followingUser.data.cameraPosition.x,
            followingUser.data.cameraPosition.y,
            followingUser.data.cameraPosition.z
        );
    }, [followingUserId, otherUsers]);

    const snapCameraIfFollowingUser = useCallback(() => {
        if (!followPresenter) return;
        const followingUserPos = getFollowingUserPosition();
        if (!followingUserPos) return;
        if (!cameraRef.current) return;
        if (cameraRef.current.position.equals(followingUserPos)) return;
        expectedPositionUpdatesRef.current.push(followingUserPos);
        cameraRef.current.setPosition(followingUserPos);
    }, [followPresenter, getFollowingUserPosition]);

    /**
     * Update camera position when following user's presence changes
     */
    useEffect(() => {
        snapCameraIfFollowingUser();
    }, [snapCameraIfFollowingUser]);

    /**
     * Take control of presenting, causing all other user's camera positions to update to match the local user's
     */
    const onClickToggleControl = () => {
        if (!localUser) return;
        if (localUser.userId === followingUserId) {
            // Cancel take control if the user is already in control
            setFollowingUserId(null);
            return;
        }
        // Local user takes control by setting the follow user ID to their own
        setFollowingUserId(localUser.userId);
    };

    /**
     * Whenever the followingUserId changes, we reset followPresenter to true
     */
    useEffect(() => {
        setFollowPresenter(true);
    }, [followingUserId]);

    const localUserIsPresenter =
        !!localUser && followingUserId === localUser.userId;

    return (
        <>
            <Engine antialias adaptToDeviceRatio canvasId="babylonJS">
                <Scene
                    clearColor={Color4.FromHexString(
                        tokens.colorNeutralBackground2
                    )}
                    onReadyObservable={(scene: any) => {
                        sceneRef.current = scene;
                        if (sceneRef.current) {
                            sceneRef.current.onPointerDown = handlePointerDown;
                            applyRemoteColors();
                            snapCameraIfFollowingUser();
                        }
                    }}
                >
                    <pointLight name="omni" position={new Vector3(0, 50, 0)} />
                    <arcRotateCamera
                        name="arc"
                        target={new Vector3(0, 0, 0)}
                        alpha={Math.PI / 2}
                        beta={Math.PI / 2}
                        radius={150}
                        wheelPrecision={50} // Adjust this to make zoom faster/slower
                        panningSensibility={100} // Adjust this to make panning faster/slower
                        onViewMatrixChangedObservable={(evt: any) => {
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
                                !followingUserId ||
                                localUser?.userId === followingUserId ||
                                !followPresenter
                            ) {
                                return;
                            }
                            const currentRemotePos = getFollowingUserPosition();
                            if (
                                !currentRemotePos ||
                                vectorsAreRoughlyEqual(
                                    currentRemotePos,
                                    evt.position
                                )
                            ) {
                                return;
                            }
                            // Update state so that "Sync to presenter" button is shown
                            setFollowPresenter(false);
                        }}
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
                                rootUrl={plane.replace("plane.glb", "")}
                                sceneFilename={"plane.glb"}
                            />
                        </Suspense>
                    </ErrorBoundary>
                </Scene>
            </Engine>
            {selectedMaterialName && (
                <div
                    style={{
                        position: "absolute",
                        top: "24px",
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
                            setMaterialColor(selectedMaterialName, value);
                            if (!sceneRef.current) return;
                            const material =
                                sceneRef.current.getMaterialByName(
                                    selectedMaterialName
                                );
                            if (material && material instanceof PBRMaterial) {
                                const color = Color3.FromHexString(value);
                                material.albedoColor = color;
                            }
                        }}
                    />
                </div>
            )}
            {/* Presenter control bar */}
            {localUser && (
                <FlexRow
                    hAlign="end"
                    gap="small"
                    style={{
                        position: "absolute",
                        bottom: "24px",
                        right: "24px",
                    }}
                >
                    {!!followingUserId &&
                        !followPresenter &&
                        !localUserIsPresenter && (
                            <Button
                                onClick={() => {
                                    setFollowPresenter(true);
                                }}
                            >
                                {"Sync to presenter"}
                            </Button>
                        )}
                    <Button appearance="primary" onClick={onClickToggleControl}>
                        {followingUserId !== localUser.userId
                            ? "Take control"
                            : "Release control"}
                    </Button>
                </FlexRow>
            )}
        </>
    );
};

const ROUNDING_ERROR_TOLERANCE = 0.000000000001;
function vectorsAreRoughlyEqual(v1: Vector3, v2: Vector3): boolean {
    console.log(Math.abs(v1.x - v2.x));
    if (Math.abs(v1.x - v2.x) >= ROUNDING_ERROR_TOLERANCE) {
        return false;
    }
    if (Math.abs(v1.y - v2.y) >= ROUNDING_ERROR_TOLERANCE) {
        return false;
    }
    if (Math.abs(v1.z - v2.z) >= ROUNDING_ERROR_TOLERANCE) {
        return false;
    }
    return true;
}
