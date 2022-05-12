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

export const getRandomAvatar = () => {
  const avatars = [];
  for (let i = 0; i <= 11; i++) {
    avatars.push(i);
  }

  function random(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  const avatarIndex = random(avatars);
  const randomNumbers = [];
  for (let i = 0; i <= 99; i++) {
    randomNumbers.push(i);
  }
  const randomName = `${random(randomFrontNames)}${random(
    randomBackNames
  )}${random(randomNumbers)}`;

  return {
    name: randomName,
    avatarIndex,
  };
};
