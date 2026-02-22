import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import useStore from '../store/useStore';
import { BookOpen, Fingerprint, Clock, Trophy, RotateCcw } from 'lucide-react';

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

export default function Analytics() {
    const practiceLog = useStore((s) => s.practiceLog);
    const sessionStart = useStore((s) => s.sessionStart);
    const resetAll = useStore((s) => s.resetAll);
    const [showConfirm, setShowConfirm] = useState(false);

    const totalPracticed = practiceLog.length;
    const uniqueChars = useMemo(() => {
        const set = new Set(practiceLog.map((p) => p.char));
        return set.size;
    }, [practiceLog]);

    const totalMinutes = useMemo(() => {
        return Math.floor((Date.now() - sessionStart) / 60000);
    }, [sessionStart]);

    const topChars = useMemo(() => {
        const counts = {};
        practiceLog.forEach(({ char }) => {
            counts[char] = (counts[char] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([char, count]) => ({ char, count }));
    }, [practiceLog]);

    const topChar = topChars.length > 0 ? topChars[0] : null;
    const maxCount = topChars.length > 0 ? topChars[0].count : 1;

    const stats = [
        {
            icon: BookOpen,
            label: 'Total Practiced',
            value: totalPracticed,
            color: '#6c63ff',
        },
        {
            icon: Fingerprint,
            label: 'Unique Letters',
            value: uniqueChars,
            color: '#00d9a3',
        },
        {
            icon: Clock,
            label: 'Session Time',
            value: `${totalMinutes}m`,
            color: '#ff6b6b',
        },
        {
            icon: Trophy,
            label: 'Most Practiced',
            value: topChar ? topChar.char.toUpperCase() : '—',
            color: '#8b5cf6',
        },
    ];

    const handleReset = () => {
        resetAll();
        setShowConfirm(false);
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="page-content px-4 pb-24"
        >
            <motion.div variants={itemVariants} className="mb-10 mt-6">
                <h2 className="font-syne text-[2.5rem] tracking-tighter mb-2 leading-none text-white">Analytics</h2>
                <p className="text-base font-dm text-[#555555]">
                    Quantify your sensory learning.
                </p>
            </motion.div>

            {/* Stat Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 mb-6">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <GlassCard key={stat.label} hover={false} className="p-5">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4 bg-white/[0.03] border border-white/[0.05] shadow-inner">
                                <Icon size={20} style={{ color: stat.color }} />
                            </div>
                            <div className="text-[2rem] font-syne font-extrabold leading-none mb-1 text-white">
                                {stat.value}
                            </div>
                            <p className="text-xs font-dm tracking-widest uppercase text-[#555555]">
                                {stat.label}
                            </p>
                        </GlassCard>
                    );
                })}
            </motion.div>

            {/* Horizontal Bar Chart */}
            {topChars.length > 0 && (
                <motion.div variants={itemVariants}>
                    <GlassCard className="mb-6 p-6" hover={false}>
                        <h3 className="font-syne text-lg tracking-tight mb-6 text-white">
                            Character Proficiency
                        </h3>
                        <div className="flex flex-col gap-5">
                            {topChars.map((item, i) => {
                                const widthPct = (item.count / maxCount) * 100;
                                return (
                                    <div key={item.char} className="flex items-center gap-4">
                                        <div className="w-6 text-xl font-syne font-bold text-white text-center">
                                            {item.char.toUpperCase()}
                                        </div>
                                        <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden relative">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${widthPct}%` }}
                                                transition={{ duration: 1, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                                                className="absolute top-0 left-0 h-full rounded-full"
                                                style={{ background: 'linear-gradient(90deg, #6c63ff, #00d9a3)' }}
                                            />
                                        </div>
                                        <div className="w-8 text-right text-xs font-dm text-[#555555] font-medium">
                                            {item.count}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </GlassCard>
                </motion.div>
            )}

            {/* Empty State */}
            {topChars.length === 0 && (
                <motion.div variants={itemVariants}>
                    <GlassCard className="mb-6 p-10 text-center" hover={false}>
                        <p className="font-dm text-sm text-[#555555] leading-relaxed">
                            No practice data recorded yet. Head to the Braille Typer or SnapOCR to start your learning journey.
                        </p>
                    </GlassCard>
                </motion.div>
            )}

            {/* Reset Button */}
            <motion.div variants={itemVariants}>
                <AnimatePresence mode="wait">
                    {!showConfirm ? (
                        <motion.button
                            key="reset-btn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            onClick={() => setShowConfirm(true)}
                            className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-sm font-dm font-bold text-[#ff4757] bg-white/[0.02] border border-white/[0.05]"
                        >
                            <RotateCcw size={18} />
                            Erase All Data
                        </motion.button>
                    ) : (
                        <motion.div
                            key="confirm-card"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <GlassCard hover={false} className="p-6">
                                <p className="font-dm text-sm mb-5 text-[#ff4757] font-medium text-center">
                                    Irreversible action. Erase progress?
                                </p>
                                <div className="flex gap-4">
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleReset}
                                        className="flex-1 py-3 rounded-xl font-dm font-bold text-sm bg-[#ff4757] text-white shadow-[0_4px_16px_rgba(255,71,87,0.3)]"
                                    >
                                        Confirm
                                    </motion.button>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setShowConfirm(false)}
                                        className="flex-1 py-3 rounded-xl font-dm font-bold text-sm bg-white/[0.05] border border-white/[0.05] text-[#EDEDED]"
                                    >
                                        Cancel
                                    </motion.button>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}
