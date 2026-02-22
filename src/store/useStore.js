import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
    persist(
        (set, get) => ({
            // ─── State ─────────────────────────────
            masteredWords: [],
            practiceLog: [], // [{ char, timestamp }]
            sessionStart: Date.now(),
            settings: {
                speed: 1.0,
            },

            // ─── Actions ───────────────────────────
            addMastered: (word) =>
                set((state) => ({
                    masteredWords: state.masteredWords.includes(word)
                        ? state.masteredWords
                        : [...state.masteredWords, word],
                })),

            logPractice: (char) =>
                set((state) => ({
                    practiceLog: [
                        ...state.practiceLog,
                        { char: char.toLowerCase(), timestamp: Date.now() },
                    ],
                })),

            setSpeed: (n) =>
                set((state) => ({
                    settings: { ...state.settings, speed: n },
                })),

            resetAll: () =>
                set({
                    masteredWords: [],
                    practiceLog: [],
                    sessionStart: Date.now(),
                    settings: { speed: 1.0 },
                }),

            // ─── Computed ──────────────────────────
            get topChars() {
                const log = get().practiceLog;
                const counts = {};
                log.forEach(({ char }) => {
                    counts[char] = (counts[char] || 0) + 1;
                });
                return Object.entries(counts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([char, count]) => ({ char, count }));
            },

            get totalMinutes() {
                return Math.floor((Date.now() - get().sessionStart) / 60000);
            },
        }),
        {
            name: 'haptiq-storage',
        }
    )
);

// Helper selectors (since Zustand v5 getters via get() work differently
// we expose them as standalone selectors)
export const selectTopChars = (state) => {
    const counts = {};
    state.practiceLog.forEach(({ char }) => {
        counts[char] = (counts[char] || 0) + 1;
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([char, count]) => ({ char, count }));
};

export const selectTotalMinutes = (state) => {
    return Math.floor((Date.now() - state.sessionStart) / 60000);
};

export default useStore;
