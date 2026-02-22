import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hand, Map, Camera, BarChart2, ArrowRight } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import AndroidBanner from '../components/AndroidBanner';

const useCountUp = (target, duration = 1500) => {
    const [count, setCount] = useState(0)
    useEffect(() => {
        let start = 0
        const step = target / (duration / 16)
        const timer = setInterval(() => {
            start += step
            if (start >= target) { setCount(target); clearInterval(timer) }
            else setCount(Math.floor(start))
        }, 16)
        return () => clearInterval(timer)
    }, [target, duration])
    return count
}

const modules = [
    {
        to: '/braille',
        icon: Hand,
        title: 'Braille Typer',
        desc: 'Type words and feel them in Braille vibrations',
        color: '#6c63ff',
    },
    {
        to: '/diagram',
        icon: Map,
        title: 'Diagram Explorer',
        desc: 'Slide your finger to feel shapes and maps',
        color: '#00d9a3',
    },
    {
        to: '/ocr',
        icon: Camera,
        title: 'Snap & Read',
        desc: 'Point your camera at text to feel and hear it',
        color: '#ff6b6b',
    },
    {
        to: '/analytics',
        icon: BarChart2,
        title: 'Analytics',
        desc: 'Track your learning progress over time',
        color: '#8b5cf6',
    },
];

export default function Home() {
    const navigate = useNavigate();
    const costCount = useCountUp(150000);

    return (
        <div className="page-content px-4">
            <AndroidBanner />

            {/* Hero */}
            <div className="mb-8 mt-6">
                <div className="inline-block px-3 py-1 bg-white/5 rounded-full text-xs text-white/50 mb-6 border border-white/5">
                    Welcome, Guest User
                </div>
                <h1 className="text-4xl font-bold mb-4 text-white">HaptiQ</h1>
                <p className="text-xl mb-3 leading-relaxed text-gray-400">
                    Feel knowledge. <span className="text-white/80">No hardware needed.</span>
                </p>
                <p className="text-sm leading-relaxed text-gray-500">
                    Haptic Braille learning for everyone. Works exclusively on Android devices with vibration capabilities.
                </p>
            </div>

            {/* Animated Stats Row */}
            <div className="grid grid-cols-3 gap-3 mb-10">
                <GlassCard hover={false} className="p-4 flex flex-col justify-center text-center !bg-white/5">
                    <span className="font-syne text-xl font-bold text-[#ff6b6b] leading-none mb-1">
                        ₹{costCount.toLocaleString('en-IN')}
                    </span>
                    <span className="font-dm text-[10px] text-[#555555] leading-tight uppercase tracking-wider">
                        Hardware Cost
                    </span>
                </GlassCard>

                <GlassCard hover={false} className="p-4 flex flex-col justify-center text-center !bg-white/[0.08] ring-1 ring-[#00d9a3]/30 shadow-[0_0_15px_rgba(0,217,163,0.15)]">
                    <span className="font-syne text-xl font-bold text-[#00d9a3] leading-none mb-1">
                        ₹0
                    </span>
                    <span className="font-dm text-[10px] text-[#00d9a3] opacity-80 leading-tight uppercase tracking-wider">
                        Cost of HaptiQ
                    </span>
                </GlassCard>

                <GlassCard hover={false} className="p-4 flex flex-col justify-center text-center !bg-white/5">
                    <span className="font-syne text-xl font-bold text-[#6c63ff] leading-none mb-1">
                        500M+
                    </span>
                    <span className="font-dm text-[10px] text-[#555555] leading-tight uppercase tracking-wider">
                        Visually Impaired
                    </span>
                </GlassCard>
            </div>

            {/* Module Grid */}
            <div className="grid grid-cols-2 gap-4 pb-24">
                {modules.map((mod) => {
                    const Icon = mod.icon;
                    return (
                        <div
                            key={mod.to}
                            onClick={() => navigate(mod.to)}
                            className="cursor-pointer active:scale-95 transition-transform"
                        >
                            <GlassCard className="h-full flex flex-col justify-between p-5">
                                <div>
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-white/5 border border-white/5">
                                        <Icon size={24} style={{ color: mod.color }} />
                                    </div>
                                    <h3 className="text-base font-semibold mb-2 text-white">
                                        {mod.title}
                                    </h3>
                                    <p className="text-xs leading-relaxed text-gray-500">
                                        {mod.desc}
                                    </p>
                                </div>
                                <div className="flex justify-end mt-4">
                                    <ArrowRight size={18} className="text-gray-500" />
                                </div>
                            </GlassCard>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
