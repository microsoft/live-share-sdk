/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const randomFrontNames = [
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

const randomBackNames = [
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

function random<TData = any>(list: TData[]) {
    return list[Math.floor(Math.random() * list.length)];
}

export const getRandomUserName = (): string => {
    const avatars = [];
    for (let i = 0; i <= 11; i++) {
        avatars.push(i);
    }

    const randomNumbers = [];
    for (let i = 0; i <= 99; i++) {
        randomNumbers.push(i);
    }
    const randomName = `${random<string>(randomFrontNames)}${random<string>(
        randomBackNames
    )}${random(randomNumbers)}`;

    return randomName;
};