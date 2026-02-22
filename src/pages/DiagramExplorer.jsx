import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import { vibrate, stop } from '../lib/haptics';
import { Upload, Circle, Triangle, Square } from 'lucide-react';

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

const SHAPE_META = [
    { type: 'circle', label: 'Circle', icon: Circle, color: '#6c63ff' },
    { type: 'triangle', label: 'Triangle', icon: Triangle, color: '#00d9a3' },
    { type: 'rectangle', label: 'Rectangle', icon: Square, color: '#ff6b6b' },
];

export default function DiagramExplorer() {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isOnLine, setIsOnLine] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const canvasRef = useRef(null);
    const canvasContainerRef = useRef(null);
    const fileInputRef = useRef(null);

    const sampleShapes = useMemo(() => {
        const make = (drawFn) => {
            const c = document.createElement('canvas')
            c.width = 300
            c.height = 300
            const ctx = c.getContext('2d')
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, 300, 300)
            ctx.strokeStyle = '#000000'
            ctx.lineWidth = 10
            drawFn(ctx)
            return c.toDataURL('image/png')
        }
        return [
            {
                name: 'Circle',
                src: make((ctx) => { ctx.beginPath(); ctx.arc(150, 150, 120, 0, Math.PI * 2); ctx.stroke() })
            },
            {
                name: 'Triangle',
                src: make((ctx) => { ctx.beginPath(); ctx.moveTo(150, 20); ctx.lineTo(280, 270); ctx.lineTo(20, 270); ctx.closePath(); ctx.stroke() })
            },
            {
                name: 'Rectangle',
                src: make((ctx) => { ctx.strokeRect(30, 60, 240, 180) })
            }
        ]
    }, [])

    // Move canvas into the visible container when imageLoaded changes
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = canvasContainerRef.current;
        if (imageLoaded && canvas && container) {
            container.appendChild(canvas);
            canvas.style.display = 'block';
            canvas.style.maxWidth = '100%';
            canvas.style.touchAction = 'none';
            canvas.style.cursor = 'crosshair';
        }
    }, [imageLoaded]);

    const loadImageToCanvas = (file) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const url = typeof file === 'string' ? file : URL.createObjectURL(file)
        img.onload = () => {
            const maxSize = 1000
            let w = img.naturalWidth || img.width
            let h = img.naturalHeight || img.height
            if (w > maxSize) { h = Math.floor(h * maxSize / w); w = maxSize }
            if (h > maxSize) { w = Math.floor(w * maxSize / h); h = maxSize }
            canvas.width = w
            canvas.height = h
            ctx.clearRect(0, 0, w, h)
            ctx.drawImage(img, 0, 0, w, h)
            if (typeof file !== 'string') URL.revokeObjectURL(url)
            setImageLoaded(true)
        }
        img.onerror = () => {
            if (typeof file !== 'string') URL.revokeObjectURL(url)
        }
        img.src = url
    }

    // (4) Pointer/touch movement — haptic feedback on lines
    const handlePointerMove = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (e.touches) e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor((clientX - rect.left) * scaleX);
        const y = Math.floor((clientY - rect.top) * scaleY);
        setCoords({ x, y });

        if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
            vibrate(0);
            setIsOnLine(false);
            return;
        }

        const ctx = canvas.getContext('2d');
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const alpha = pixel[3];

        if (alpha < 128) {
            vibrate(0);
            setIsOnLine(false);
            return;
        }

        const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;

        if (brightness < 128) {
            vibrate([60]);
            setIsOnLine(true);
        } else {
            vibrate(0);
            setIsOnLine(false);
        }
    }, []);

    const handleClear = useCallback(() => {
        setImageLoaded(false);
        setIsOnLine(false);
        setCoords({ x: 0, y: 0 });
        stop();
        // Hide the canvas again
        const canvas = canvasRef.current;
        if (canvas) canvas.style.display = 'none';
    }, []);

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="page-content px-4 pb-24"
        >
            <motion.div variants={itemVariants} className="mb-10 mt-6">
                <h2 className="font-syne text-[2.5rem] tracking-tighter mb-2 leading-none text-white">
                    Diagram Explorer
                </h2>
                <p className="text-base font-dm text-[#555555]">
                    Trace lines blindly and feel the edges.
                </p>
            </motion.div>

            {/*
              Single persistent canvas — always in DOM, never unmounted.
              Hidden by default, shown & repositioned via useEffect when imageLoaded.
              Touch/mouse events are attached via native listeners in useEffect.
            */}
            <canvas
                ref={canvasRef}
                style={{ touchAction: 'none', maxWidth: '100%', display: imageLoaded ? 'block' : 'none' }}
                onMouseMove={handlePointerMove}
                onTouchMove={(e) => { e.preventDefault(); handlePointerMove(e); }}
                onMouseLeave={() => { vibrate(0); setIsOnLine(false); }}
                onTouchEnd={() => { vibrate(0); setIsOnLine(false); }}
            />

            {!imageLoaded ? (
                <AnimatePresence mode="wait">
                    <motion.div key="upload" variants={containerVariants} initial="hidden" animate="show" exit="hidden">
                        {/* (1 & 2) Upload Zone with click and drag-and-drop */}
                        <motion.div variants={itemVariants}>
                            <GlassCard
                                className={`mb-6 cursor-pointer group ${dragging ? 'ring-2 ring-[#6c63ff]' : ''}`}
                                hover={false}
                                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDragging(true);
                                }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDragging(false);
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) loadImageToCanvas(file);
                                }}
                                style={{
                                    border: '1px dashed rgba(255, 255, 255, 0.15)',
                                    textAlign: 'center',
                                    padding: '48px 20px',
                                }}
                            >
                                <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                                    <Upload size={32} style={{ color: '#EDEDED' }} />
                                </div>
                                <h3 className="font-syne text-lg text-white mb-2">
                                    {dragging ? 'Drop it here' : 'Upload Diagram'}
                                </h3>
                                <p className="font-dm text-sm text-[#555555]">
                                    Tap to browse or drag & drop an image
                                </p>
                            </GlassCard>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) loadImageToCanvas(file)
                                }}
                            />
                        </motion.div>

                        {/* (5) Sample Shapes */}
                        <motion.div variants={itemVariants}>
                            <p className="text-xs font-dm mb-4 tracking-widest uppercase text-[#555555]">
                                Pre-loaded Modules
                            </p>
                            <div className="flex gap-4">
                                {sampleShapes.map((shape) => (
                                    <img
                                        key={shape.name}
                                        src={shape.src}
                                        alt={shape.name}
                                        onClick={() => loadImageToCanvas(shape.src)}
                                        style={{ width: 80, height: 80, cursor: 'pointer', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div key="canvas-view" variants={containerVariants} initial="hidden" animate="show" exit="hidden">
                        {/* Canvas container — the persistent canvas is moved here via useEffect */}
                        <motion.div variants={itemVariants}>
                            <GlassCard className="mb-6 overflow-hidden p-1 bg-black border border-white/[0.05]" hover={false}>
                                <div ref={canvasContainerRef} className="rounded-2xl overflow-hidden relative" />
                            </GlassCard>
                        </motion.div>

                        {/* Status Badge */}
                        <motion.div variants={itemVariants} className="flex justify-between items-center mb-8 px-2">
                            <div className="flex items-center gap-3">
                                <motion.div
                                    animate={{
                                        backgroundColor: isOnLine ? '#00d9a3' : '#555555',
                                        scale: isOnLine ? [1, 1.2, 1] : 1,
                                        boxShadow: isOnLine ? '0 0 12px rgba(0,217,163,0.8)' : 'none'
                                    }}
                                    transition={{ duration: isOnLine ? 0.4 : 0.2 }}
                                    className="w-3 h-3 rounded-full"
                                />
                                <span
                                    className="text-sm font-dm font-bold transition-colors duration-200"
                                    style={{ color: isOnLine ? '#00d9a3' : '#555555' }}
                                >
                                    {isOnLine ? 'Haptic feedback active' : 'Scanning open space'}
                                </span>
                            </div>
                            <span className="text-xs font-dm tabular-nums text-[#555555] bg-white/[0.03] px-3 py-1 rounded-md">
                                X: {coords.x} Y: {coords.y}
                            </span>
                        </motion.div>

                        {/* Clear Action */}
                        <motion.div variants={itemVariants}>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleClear}
                                className="w-full py-4 rounded-2xl flex items-center justify-center text-sm font-dm font-bold bg-white/[0.05] border border-white/[0.1] text-white"
                            >
                                Clear & Select New Diagram
                            </motion.button>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            )}
        </motion.div>
    );
}
