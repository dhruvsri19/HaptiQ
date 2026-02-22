import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import { BRAILLE_PATTERNS, charToPattern, wordToVibration } from '../lib/braille';
import { vibrate, speak, stop } from '../lib/haptics';
import useStore from '../store/useStore';
import { Play } from 'lucide-react';

const SPEED_OPTIONS = [
    { label: 'Slow', value: 0.6 },
    { label: 'Normal', value: 1.0 },
    { label: 'Fast', value: 1.5 },
];

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

function BrailleDotGrid({ activeDots }) {
    // 6-dot cell: rows 1-3, cols 1-2
    // Layout: [1,4], [2,5], [3,6]
    const grid = [
        [1, 4],
        [2, 5],
        [3, 6],
    ];

    return (
        <div className="flex flex-col items-center gap-4 p-4 rounded-3xl bg-black/40 shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)] border border-white/[0.02]">
            {grid.map((row, ri) => (
                <div key={ri} className="flex gap-5">
                    {row.map((dot) => {
                        const isActive = activeDots.includes(dot);
                        return (
                            <motion.div
                                key={dot}
                                animate={{
                                    scale: isActive ? 1.05 : 1,
                                    backgroundColor: isActive ? '#6c63ff' : 'rgba(20,20,30,0.5)',
                                    boxShadow: isActive
                                        ? 'inset 0 2px 4px rgba(255,255,255,0.4), 0 0 16px rgba(108, 99, 255, 0.8), 0 0 4px rgba(108, 99, 255, 1)'
                                        : 'inset 0 4px 6px rgba(0,0,0,0.8), inset 0 -1px 1px rgba(255,255,255,0.05)',
                                    borderColor: isActive ? 'rgba(108,99,255,0.5)' : 'rgba(255,255,255,0.02)'
                                }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                className="w-8 h-8 rounded-full border"
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

export default function BrailleTyper() {
    const [input, setInput] = useState('');
    const [currentChar, setCurrentChar] = useState('');
    const [history, setHistory] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const speed = useStore((s) => s.settings.speed);
    const setSpeed = useStore((s) => s.setSpeed);
    const logPractice = useStore((s) => s.logPractice);
    const addMastered = useStore((s) => s.addMastered);

    const scalePattern = useCallback(
        (pattern) => pattern.map((v) => Math.round(v / speed)),
        [speed]
    );

    const handleInput = useCallback(
        (e) => {
            const value = e.target.value;
            setInput(value);

            if (value.length > 0) {
                const lastChar = value[value.length - 1].toLowerCase();
                setCurrentChar(lastChar);

                const pattern = BRAILLE_PATTERNS[lastChar];
                if (pattern) {
                    vibrate(scalePattern(pattern));
                    speak(lastChar);
                    logPractice(lastChar);
                }
            } else {
                setCurrentChar('');
            }
        },
        [scalePattern, logPractice]
    );

    const handlePlayWord = useCallback(async () => {
        if (!input.trim() || isPlaying) return;
        setIsPlaying(true);

        const word = input.trim().toLowerCase();
        const pattern = wordToVibration(word);
        vibrate(scalePattern(pattern));
        speak(word, 0.7);
        addMastered(word);

        setHistory((prev) => {
            return [word, ...prev.filter((w) => w !== word)].slice(0, 5);
        });

        const duration = scalePattern(pattern).reduce((sum, v) => sum + v, 0);
        setTimeout(() => setIsPlaying(false), duration);
    }, [input, isPlaying, scalePattern, addMastered]);

    const handleHistoryClick = useCallback(
        (word) => {
            setInput(word);
            setCurrentChar(word[word.length - 1]);
            const pattern = wordToVibration(word);
            vibrate(scalePattern(pattern));
            speak(word, 0.7);
        },
        [scalePattern]
    );

    const activeDots = charToPattern(currentChar);

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="page-content px-4"
        >
            <motion.div variants={itemVariants} className="mb-10 mt-6">
                <h2 className="font-syne text-[2.5rem] tracking-tighter mb-2 leading-none text-white">Braille Typer</h2>
                <p className="text-base font-dm text-[#555555]">
                    Type a word and feel the hardware layout.
                </p>
            </motion.div>

            {/* Main Input Card */}
            <motion.div variants={itemVariants}>
                <GlassCard className="mb-6 p-6" hover={false}>
                    <input
                        type="text"
                        value={input}
                        onChange={handleInput}
                        placeholder="Type a word..."
                        className="w-full bg-black/30 border border-white/[0.05] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] rounded-2xl p-5 text-2xl font-dm text-white focus:outline-none focus:border-[#6c63ff]/50 transition-colors mb-8"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                    />

                    {/* Braille Dot Display */}
                    <div className="flex flex-col items-center justify-center gap-6 mb-8">
                        <BrailleDotGrid activeDots={activeDots} />
                        {currentChar && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center"
                            >
                                <div className="text-[4rem] font-syne font-extrabold leading-none text-[#6c63ff] drop-shadow-[0_0_20px_rgba(108,99,255,0.4)]">
                                    {currentChar.toUpperCase()}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Play Word Button */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        onClick={handlePlayWord}
                        disabled={!input.trim() || isPlaying}
                        className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-lg font-dm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            background: 'white',
                            color: 'black',
                            boxShadow: '0 8px 32px rgba(255,255,255,0.15)',
                        }}
                    >
                        <Play size={20} fill="currentColor" />
                        {isPlaying ? 'Playing...' : 'Play Word'}
                    </motion.button>
                </GlassCard>
            </motion.div>

            {/* Speed Control */}
            <motion.div variants={itemVariants}>
                <GlassCard className="mb-6" hover={false}>
                    <p className="text-xs font-dm mb-4 tracking-widest uppercase text-[#555555]">
                        Feedback Speed
                    </p>
                    <div className="flex gap-2">
                        {SPEED_OPTIONS.map((opt) => (
                            <motion.button
                                key={opt.value}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSpeed(opt.value)}
                                className="flex-1 py-3 rounded-xl text-sm font-dm font-medium border border-white/[0.05]"
                                style={{
                                    background: speed === opt.value ? 'white' : 'rgba(255,255,255,0.02)',
                                    color: speed === opt.value ? 'black' : '#EDEDED',
                                }}
                            >
                                {opt.label}
                            </motion.button>
                        ))}
                    </div>
                </GlassCard>
            </motion.div>

            {/* Word History */}
            {history.length > 0 && (
                <motion.div variants={itemVariants} className="pb-24">
                    <p className="text-xs font-dm mb-4 tracking-widest uppercase text-[#555555]">
                        Recent Practice
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {history.map((word) => (
                            <motion.button
                                key={word}
                                whileTap={{ scale: 0.92 }}
                                onClick={() => handleHistoryClick(word)}
                                className="px-5 py-2.5 rounded-full text-base font-dm font-medium bg-white/[0.05] border border-white/[0.05] text-[#EDEDED]"
                            >
                                {word}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
