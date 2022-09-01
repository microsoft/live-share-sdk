/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IUserInfo } from "@microsoft/live-share-inking";

const firstNames = [
    "Dog",
    "Cat",
    "Clippy",
    "Micro",
    "Snake",
    "Dr",
    "Dino",
    "Gamer",
    "Rock",
    "Paper",
    "Scissors",
];

const lastNames = [
    "Dev",
    "Official",
    "Main",
    "Purse",
    "Star",
    "Martian",
    "Gaze",
    "Lock",
    "World",
    "Smile",
    "Stylist",
];

function getRandomValue(list: string[]): string {
    return list[Math.floor(Math.random() * list.length)];
}

export function getRandomUserInfo(): IUserInfo {
    const firstName = getRandomValue(firstNames);
    const lastName = getRandomValue(lastNames);

    return {
        displayName: `${firstName} ${lastName}`
    }
}