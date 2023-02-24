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

// This function generates a random name for the user. It randomly
// chooses a front name, a last name, and a number between 0 and 99.
// The front name and last name are chosen from a list of names.
// The number is chosen from a list of numbers between 0 and 99.
//
// The function returns a string containing the randomly chosen
// front name, last name, and number.
export const getRandomUserName = (): string => {
    // Create the array of avatars
    const avatars = [];
    for (let i = 0; i <= 11; i++) {
        avatars.push(i);
    }

    // Create the array of random numbers
    const randomNumbers = [];
    for (let i = 0; i <= 99; i++) {
        randomNumbers.push(i);
    }

    // Generate the random name
    const randomName = `${random<string>(randomFrontNames)}${random<string>(
        randomBackNames
    )}${random(randomNumbers)}`;

    return randomName;
};
