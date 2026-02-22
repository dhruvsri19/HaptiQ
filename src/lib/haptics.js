/**
 * Haptics & Speech Utilities
 * Uses Web Vibration API and Web Speech API
 */

/**
 * Check if vibration is supported
 * @returns {boolean}
 */
export function isSupported() {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Fire a vibration pattern
 * @param {number|number[]} pattern - duration or [on, off, on, ...] pattern
 */
export function vibrate(pattern) {
    if (isSupported()) {
        navigator.vibrate(pattern);
    }
}

/**
 * Stop any ongoing vibration
 */
export function stop() {
    if (isSupported()) {
        navigator.vibrate(0);
    }
}

/**
 * Speak text using Web Speech API
 * @param {string} text - text to speak
 * @param {number} rate - speech rate (default 0.85)
 */
export function speak(text, rate = 0.85) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
}
