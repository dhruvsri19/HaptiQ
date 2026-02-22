import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'vl_banner_dismissed';

export default function AndroidBanner() {
    const [dismissed, setDismissed] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            setDismissed(false);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setDismissed(true);
    };

    if (dismissed) return null;

    return (
        <div
            className="relative rounded-xl px-4 py-3 mb-4 animate-fade-slide-up"
            style={{
                background: 'rgba(255, 193, 7, 0.10)',
                border: '1px solid rgba(255, 193, 7, 0.25)',
            }}
        >
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 rounded-lg transition-colors duration-200 hover:bg-white/10"
                aria-label="Dismiss banner"
            >
                <X size={16} style={{ color: 'rgba(255, 193, 7, 0.8)' }} />
            </button>
            <p
                className="text-sm pr-6 font-dm"
                style={{ color: 'rgba(255, 193, 7, 0.9)' }}
            >
                ⚡ Best on Android — iOS Safari blocks the Vibration API. Use Chrome on
                Android for full haptic experience.
            </p>
        </div>
    );
}
