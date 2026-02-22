/**
 * Grade 1 English Braille Vibration Pattern Map
 * 6-dot cell: dots numbered 1-6 (left-top to right-bottom)
 *   1 4
 *   2 5
 *   3 6
 *
 * Each raised dot = 160ms vibration
 * Gap between dots within cell = 70ms pause
 * Gap between cells = 500ms pause
 */

// Dot positions for each character
const DOT_MAP = {
    a: [1],
    b: [1, 2],
    c: [1, 4],
    d: [1, 4, 5],
    e: [1, 5],
    f: [1, 2, 4],
    g: [1, 2, 4, 5],
    h: [1, 2, 5],
    i: [2, 4],
    j: [2, 4, 5],
    k: [1, 3],
    l: [1, 2, 3],
    m: [1, 3, 4],
    n: [1, 3, 4, 5],
    o: [1, 3, 5],
    p: [1, 2, 3, 4],
    q: [1, 2, 3, 4, 5],
    r: [1, 2, 3, 5],
    s: [2, 3, 4],
    t: [2, 3, 4, 5],
    u: [1, 3, 6],
    v: [1, 2, 3, 6],
    w: [2, 4, 5, 6],
    x: [1, 3, 4, 6],
    y: [1, 3, 4, 5, 6],
    z: [1, 3, 5, 6],
    '0': [2, 4, 5, 6],
    '1': [1],
    '2': [1, 2],
    '3': [1, 4],
    '4': [1, 4, 5],
    '5': [1, 5],
    '6': [1, 2, 4],
    '7': [1, 2, 4, 5],
    '8': [1, 2, 5],
    '9': [2, 4],
    ' ': [],
};

/**
 * Convert dot positions to vibration pattern.
 * Each dot = 160ms on, followed by 70ms off (except last dot).
 */
function dotsToVibration(dots) {
    if (!dots || dots.length === 0) {
        return [500]; // space = 500ms pause
    }

    const pattern = [];
    for (let i = 0; i < dots.length; i++) {
        pattern.push(160); // vibrate
        if (i < dots.length - 1) {
            pattern.push(70); // inter-dot gap
        }
    }
    return pattern;
}

// Build the full BRAILLE_PATTERNS map
export const BRAILLE_PATTERNS = {};
for (const [char, dots] of Object.entries(DOT_MAP)) {
    BRAILLE_PATTERNS[char] = dotsToVibration(dots);
}

/**
 * Returns the dot positions array for visual display
 * @param {string} char - single character
 * @returns {number[]} array of active dot positions (1-6)
 */
export function charToPattern(char) {
    const c = char.toLowerCase();
    return DOT_MAP[c] || [];
}

/**
 * Converts a word into a flat vibration pattern array.
 * Each character's pattern is followed by a 500ms inter-cell pause.
 * @param {string} word
 * @returns {number[]}
 */
export function wordToVibration(word) {
    const pattern = [];
    const chars = word.toLowerCase().split('');

    for (let i = 0; i < chars.length; i++) {
        const charPattern = BRAILLE_PATTERNS[chars[i]];
        if (charPattern) {
            pattern.push(...charPattern);
        }
        // Add inter-cell gap (except after last character)
        if (i < chars.length - 1) {
            pattern.push(500);
        }
    }

    return pattern;
}
