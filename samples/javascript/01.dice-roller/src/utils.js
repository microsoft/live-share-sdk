/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export function getRandomDiceValue() {
    return Math.floor(Math.random() * 6) + 1;
}

export function stylizeDiceElem(diceElem, diceValue) {
    // Unicode 0x2680-0x2685 are the sides of a dice (⚀⚁⚂⚃⚄⚅)
    diceElem.textContent = String.fromCodePoint(0x267f + diceValue);
    diceElem.style.color = `hsl(${diceValue * 60}, 70%, 30%)`;
}
