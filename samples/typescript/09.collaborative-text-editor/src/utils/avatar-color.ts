import { AvatarNamedColor, tokens } from "@fluentui/react-components";

const avatarColors: AvatarNamedColor[] = [
    "dark-red",
    "cranberry",
    "red",
    "pumpkin",
    "peach",
    "marigold",
    "gold",
    "brass",
    "brown",
    "forest",
    "seafoam",
    "dark-green",
    "light-teal",
    "teal",
    "steel",
    "blue",
    "royal-blue",
    "cornflower",
    "navy",
    "lavender",
    "purple",
    "grape",
    "lilac",
    "pink",
    "magenta",
    "plum",
    "beige",
    "mink",
    "platinum",
    "anchor",
];

const getHashCode = (str: string): number => {
    let hashCode = 0;
    for (let len: number = str.length - 1; len >= 0; len--) {
        const ch = str.charCodeAt(len);
        const shift = len % 8;
        hashCode ^= (ch << shift) + (ch >> (8 - shift)); // eslint-disable-line no-bitwise
    }

    return hashCode;
};

export const getAvatarColor = (str: string): AvatarNamedColor => {
    return avatarColors[getHashCode(str) % avatarColors.length];
};

export const getAvatarBackgroundColorStyle = (
    color: AvatarNamedColor
): string => {
    switch (color) {
        case "dark-red":
            return tokens.colorPaletteDarkRedBackground2;
        case "cranberry":
            return tokens.colorPaletteCranberryBackground2;
        case "red":
            return tokens.colorPaletteRedBackground2;
        case "pumpkin":
            return tokens.colorPalettePumpkinBackground2;
        case "peach":
            return tokens.colorPalettePeachBackground2;
        case "marigold":
            return tokens.colorPaletteMarigoldBackground2;
        case "gold":
            return tokens.colorPaletteGoldBackground2;
        case "brass":
            return tokens.colorPaletteBrassBackground2;
        case "brown":
            return tokens.colorPaletteBrownBackground2;
        case "forest":
            return tokens.colorPaletteForestBackground2;
        case "seafoam":
            return tokens.colorPaletteSeafoamBackground2;
        case "dark-green":
            return tokens.colorPaletteDarkGreenBackground2;
        case "light-teal":
            return tokens.colorPaletteLightTealBackground2;
        case "teal":
            return tokens.colorPaletteTealBackground2;
        case "steel":
            return tokens.colorPaletteSteelBackground2;
        case "blue":
            return tokens.colorPaletteBlueBackground2;
        case "royal-blue":
            return tokens.colorPaletteRoyalBlueBackground2;
        case "cornflower":
            return tokens.colorPaletteCornflowerBackground2;
        case "navy":
            return tokens.colorPaletteNavyBackground2;
        case "lavender":
            return tokens.colorPaletteLavenderBackground2;
        case "purple":
            return tokens.colorPalettePurpleBackground2;
        case "grape":
            return tokens.colorPaletteGrapeBackground2;
        case "lilac":
            return tokens.colorPaletteLilacBackground2;
        case "pink":
            return tokens.colorPalettePinkBackground2;
        case "magenta":
            return tokens.colorPaletteMagentaBackground2;
        case "plum":
            return tokens.colorPalettePlumBackground2;
        case "beige":
            return tokens.colorPaletteBeigeBackground2;
        case "mink":
            return tokens.colorPaletteMinkBackground2;
        case "platinum":
            return tokens.colorPalettePlatinumBackground2;
        case "anchor":
            return tokens.colorPaletteAnchorBackground2;
        default:
            throw new Error("avatar-color: unhandled type" + color);
    }
};
