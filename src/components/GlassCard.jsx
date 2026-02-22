import React, { forwardRef } from 'react';

const GlassCard = forwardRef(({ children, className = '', ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={`rounded-2xl p-6 bg-white/5 border border-white/10 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
});

export default GlassCard;
