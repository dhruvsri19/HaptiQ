import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Hand, Map, Camera, BarChart2 } from 'lucide-react';

const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/braille', icon: Hand, label: 'Braille' },
    { to: '/diagram', icon: Map, label: 'Diagram' },
    { to: '/ocr', icon: Camera, label: 'OCR' },
    { to: '/analytics', icon: BarChart2, label: 'Stats' },
];

export default function Nav() {
    const location = useLocation();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a14]/90 backdrop-blur-md border-t border-white/5 safe-bottom">
            <div className="flex items-center justify-around max-w-md mx-auto px-2 py-2">
                {navItems.map(({ to, icon: Icon, label }) => {
                    const isActive = location.pathname === to;
                    return (
                        <NavLink
                            key={to}
                            to={to}
                            className="flex flex-col items-center justify-center gap-1 py-1 px-3"
                        >
                            <Icon
                                size={20}
                                strokeWidth={isActive ? 2.5 : 1.5}
                                className={isActive ? 'text-white' : 'text-gray-500'}
                            />
                            <span
                                className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}
                            >
                                {label}
                            </span>
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
