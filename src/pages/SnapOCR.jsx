import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import { vibrate, speak, stop } from '../lib/haptics';
import { wordToVibration } from '../lib/braille';
import useStore from '../store/useStore';
import { Camera, Upload, ScanText, Play, Square, Loader2, AlertTriangle, RotateCcw, Copy } from 'lucide-react';

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

export default function SnapOCR() {
    const [mode, setMode] = useState(null);
    const [capturedFile, setCapturedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [extractedText, setExtractedText] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [confidence, setConfidence] = useState(null);
    const [error, setError] = useState(null);
    const [isReading, setIsReading] = useState(false);

    const cameraInputRef = useRef(null);
    const uploadInputRef = useRef(null);
    const playIntervalRef = useRef(null);
    const logPractice = useStore((s) => s.logPractice);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl)
        }
    }, [previewUrl])

    // Also stop reading when unmounting
    useEffect(() => {
        return () => {
            stop();
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            if (playIntervalRef.current) clearTimeout(playIntervalRef.current);
        }
    }, []);

    const handleFileSelected = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file')
            return
        }
        if (file.size > 20 * 1024 * 1024) {
            setError('Image too large. Please use an image under 20MB.')
            return
        }
        setError(null)
        setExtractedText('')
        setConfidence(null)
        setProgress(0)
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
        setCapturedFile(file)
        e.target.value = ''
    }

    const handleReset = () => {
        setCapturedFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setExtractedText('');
        setConfidence(null);
        setProgress(0);
        setError(null);
        setIsReading(false);
        stop();
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (playIntervalRef.current) clearTimeout(playIntervalRef.current);
    };

    const handleScanAgain = () => {
        handleReset();
        setMode(null);
    };

    const handleReadAndFeel = useCallback(() => {
        if (!extractedText || isReading) return;
        const words = extractedText.split(/\s+/).filter(Boolean);
        if (words.length === 0) return;

        setIsReading(true);
        let index = 0;

        const playNext = () => {
            if (index >= words.length) {
                setIsReading(false);
                stop();
                return;
            }

            const word = words[index].toLowerCase().replace(/[^a-z0-9\s]/g, '');

            if (word) {
                speak(word);
                const pattern = wordToVibration(word);
                vibrate(pattern);
                word.split('').forEach((c) => logPractice(c));
            }

            index++;
            playIntervalRef.current = setTimeout(playNext, 700);
        };

        playNext();
    }, [extractedText, isReading, logPractice]);

    const handleStopReading = useCallback(() => {
        setIsReading(false);
        stop();
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (playIntervalRef.current) clearTimeout(playIntervalRef.current);
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(extractedText);
    };

    const scanImage = async () => {
        if (!capturedFile || isScanning) return
        setIsScanning(true)
        setProgress(0)
        setError(null)
        setExtractedText('')

        try {
            // STEP 1: Load image onto offscreen canvas
            const img = await new Promise((resolve, reject) => {
                const i = new Image()
                i.onload = () => resolve(i)
                i.onerror = reject
                i.src = URL.createObjectURL(capturedFile)
            })

            const canvas = document.createElement('canvas')

            // STEP 2: Scale up small images — tesseract works best at 300 DPI equivalent
            // Minimum 2000px on longest side for best accuracy
            let w = img.naturalWidth
            let h = img.naturalHeight
            const minSize = 2000
            const maxSize = 3000
            if (w < minSize || h < minSize) {
                const scale = Math.min(minSize / w, minSize / h)
                w = Math.floor(w * scale)
                h = Math.floor(h * scale)
            }
            if (w > maxSize || h > maxSize) {
                const scale = Math.min(maxSize / w, maxSize / h)
                w = Math.floor(w * scale)
                h = Math.floor(h * scale)
            }
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext('2d')

            // STEP 3: Draw with white background (prevents dark background ruining binarization)
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, w, h)
            ctx.drawImage(img, 0, 0, w, h)
            setProgress(15)

            // STEP 4: Grayscale
            const imageData = ctx.getImageData(0, 0, w, h)
            const data = imageData.data
            for (let i = 0; i < data.length; i += 4) {
                const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
                data[i] = data[i + 1] = data[i + 2] = gray
            }
            setProgress(30)

            // STEP 5: Find min/max for contrast stretching
            let min = 255, max = 0
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] < min) min = data[i]
                if (data[i] > max) max = data[i]
            }
            const range = max - min || 1

            // STEP 6: Contrast stretch + sharpen
            for (let i = 0; i < data.length; i += 4) {
                const stretched = Math.round(((data[i] - min) / range) * 255)
                data[i] = data[i + 1] = data[i + 2] = Math.min(255, Math.max(0, stretched))
            }
            setProgress(45)

            // STEP 7: Adaptive-style binarization
            // Use Otsu-inspired threshold instead of fixed 128
            const histogram = new Array(256).fill(0)
            for (let i = 0; i < data.length; i += 4) histogram[data[i]]++
            const totalPixels = (data.length / 4)
            let sum = 0
            for (let i = 0; i < 256; i++) sum += i * histogram[i]
            let sumB = 0, wB = 0, maxVariance = 0, threshold = 128
            for (let t = 0; t < 256; t++) {
                wB += histogram[t]
                if (wB === 0) continue
                const wF = totalPixels - wB
                if (wF === 0) break
                sumB += t * histogram[t]
                const mB = sumB / wB
                const mF = (sum - sumB) / wF
                const variance = wB * wF * (mB - mF) ** 2
                if (variance > maxVariance) { maxVariance = variance; threshold = t }
            }

            // Apply threshold
            for (let i = 0; i < data.length; i += 4) {
                const bw = data[i] > threshold ? 255 : 0
                data[i] = data[i + 1] = data[i + 2] = bw
            }
            ctx.putImageData(imageData, 0, 0)
            setProgress(60)

            // STEP 8: Convert to blob
            const blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 1.0))
            if (!blob) throw new Error('Canvas processing failed')
            setProgress(70)

            // STEP 9: Run Tesseract with maximum accuracy settings
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker('eng', 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        const tessProgress = Math.floor(m.progress * 25)
                        setProgress(70 + tessProgress)
                    }
                }
            })

            await worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?\'"-:;()/ ',
                tessedit_pageseg_mode: '6',
                tessedit_ocr_engine_mode: '1',
                preserve_interword_spaces: '1',
                textord_heavy_nr: '1',
                edges_max_children_per_outline: '40',
            })

            const { data: result } = await worker.recognize(blob)
            await worker.terminate()
            setProgress(98)

            // STEP 10: Post-process text
            const cleaned = result.text
                .replace(/[^a-zA-Z0-9\s.,!?'"():;\-\/\n]/g, '')
                .replace(/[ \t]{2,}/g, ' ')
                .replace(/\n{3,}/g, '\n\n')
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .join('\n')

            if (!cleaned || cleaned.length < 2) {
                throw new Error('No text found. Try better lighting or hold the camera steadier.')
            }

            setExtractedText(cleaned)
            setConfidence(Math.floor(result.confidence))
            setProgress(100)

        } catch (err) {
            setError(err.message || 'Scan failed. Try again with better lighting.')
            setProgress(0)
        } finally {
            setIsScanning(false)
        }
    }

    const getProgressLabel = () => {
        if (progress <= 15) return "Loading image...";
        if (progress <= 45) return "Enhancing image...";
        if (progress <= 65) return "Optimizing contrast...";
        if (progress <= 95) return "Reading text...";
        return "Finishing up...";
    };

    const wordCount = extractedText ? extractedText.split(/\s+/).filter(Boolean).length : 0;

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="page-content px-4 pb-24">
            <motion.div variants={itemVariants} className="mb-10 mt-6">
                <h2 className="font-syne text-[2.5rem] tracking-tighter mb-2 leading-none text-white">
                    Snap & Read
                </h2>
                <p className="text-base font-dm text-[#555555]">
                    Capture reality. Process text instantly.
                </p>
            </motion.div>

            {/* 1. TWO MODE SELECTION UI */}
            {!mode && (
                <motion.div variants={itemVariants} className="flex gap-4">
                    <GlassCard
                        className="flex-1 flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-white/[0.08] transition-all"
                        onClick={() => setMode('camera')}
                    >
                        <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center mb-4">
                            <Camera size={28} className="text-white" />
                        </div>
                        <h3 className="font-syne text-lg text-white mb-1">Take Photo</h3>
                        <p className="font-dm text-xs text-[#555555]">Use your camera</p>
                    </GlassCard>

                    <GlassCard
                        className="flex-1 flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-white/[0.08] transition-all"
                        onClick={() => setMode('upload')}
                    >
                        <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center mb-4">
                            <Upload size={28} className="text-white" />
                        </div>
                        <h3 className="font-syne text-lg text-white mb-1">Upload Image</h3>
                        <p className="font-dm text-xs text-[#555555]">From your gallery</p>
                    </GlassCard>
                </motion.div>
            )}

            {/* CAPTURE / UPLOAD UI */}
            {mode && !capturedFile && (
                <motion.div variants={itemVariants}>
                    {mode === 'camera' ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <motion.button
                                whileTap={{ scale: 0.85 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                onClick={() => cameraInputRef.current?.click()}
                                className="relative w-36 h-36 rounded-full flex items-center justify-center bg-black border-[4px] border-[#6c63ff] outline-none"
                                style={{
                                    boxShadow: '0 0 60px rgba(108, 99, 255, 0.4), inset 0 0 20px rgba(108, 99, 255, 0.2)',
                                    WebkitTapHighlightColor: 'transparent',
                                }}
                            >
                                <div className="absolute inset-2 rounded-full border border-white/10" />
                                <Camera size={44} style={{ color: '#EDEDED' }} />
                            </motion.button>
                            <p className="mt-8 text-xs tracking-widest uppercase font-dm text-[#555555]">
                                Tap to Capture
                            </p>
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                style={{ display: 'none' }}
                                onChange={handleFileSelected}
                            />
                        </div>
                    ) : (
                        <GlassCard
                            className="mb-6 cursor-pointer group"
                            style={{
                                border: '1px dashed rgba(255, 255, 255, 0.15)',
                                textAlign: 'center',
                                padding: '48px 20px',
                            }}
                            onClick={() => uploadInputRef.current?.click()}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleFileSelected({ target: { files: e.dataTransfer.files } });
                            }}
                        >
                            <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                                <Upload size={32} style={{ color: '#EDEDED' }} />
                            </div>
                            <h3 className="font-syne text-lg text-white mb-2">Tap to browse or drag an image here</h3>
                            <input
                                ref={uploadInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleFileSelected}
                            />
                        </GlassCard>
                    )}

                    <div className="mt-4 flex justify-center">
                        <button onClick={() => setMode(null)} className="text-xs text-[#555555] underline hover:text-white transition-colors">
                            Back to mode selection
                        </button>
                    </div>
                </motion.div>
            )}

            {/* SCANNING & PREVIEW UI */}
            {capturedFile && !extractedText && (
                <motion.div variants={itemVariants} className="w-full">
                    <GlassCard className="mb-6 p-4 flex flex-col items-center">
                        <img
                            src={previewUrl}
                            alt="Preview"
                            style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 12 }}
                        />
                        <button
                            onClick={handleReset}
                            className="mt-4 text-xs font-dm text-[#555555] underline border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                            disabled={isScanning}
                        >
                            Change Image
                        </button>
                    </GlassCard>

                    {!isScanning && !error && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={scanImage}
                            className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-lg font-dm font-bold"
                            style={{
                                background: 'white',
                                color: 'black',
                                boxShadow: '0 8px 32px rgba(255,255,255,0.15)',
                            }}
                        >
                            <ScanText size={20} />
                            Process Text
                        </motion.button>
                    )}

                    {isScanning && (
                        <div className="mt-6">
                            <div className="flex justify-between text-xs font-dm text-[#555555] mb-2 uppercase tracking-wide">
                                <span>{getProgressLabel()}</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full"
                                    style={{ background: 'linear-gradient(90deg, #6c63ff, #00d9a3)' }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ ease: 'linear', duration: 0.3 }}
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <GlassCard className="mt-4 p-4 !bg-[#ff4757]/10 !border-[#ff4757]/20 flex flex-col items-center">
                            <div className="flex items-start gap-3 mb-4">
                                <AlertTriangle size={20} className="text-[#ff4757] mt-0.5" />
                                <p className="font-dm text-sm text-[#ff4757] leading-relaxed">{error}</p>
                            </div>
                            <button
                                onClick={() => { setError(null); setProgress(0); }}
                                className="px-4 py-2 font-dm text-sm text-[#EDEDED] bg-white/5 border border-white/10 rounded-xl"
                            >
                                Try Again
                            </button>
                        </GlassCard>
                    )}

                </motion.div>
            )}

            {/* RESULTS UI */}
            {extractedText && (
                <motion.div variants={itemVariants} className="mt-2">
                    <GlassCard className="mb-6 p-6" hover={false}>
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-xs font-dm tracking-widest uppercase text-[#555555]">
                                Extracted Text
                            </p>
                            <span className="text-xs font-dm text-[#555555]">
                                {wordCount} words detected
                            </span>
                        </div>

                        <div className="font-dm text-base leading-[1.7] text-[#EDEDED] max-h-[180px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {extractedText}
                        </div>

                        {confidence !== null && (
                            <div className="mt-4">
                                {confidence > 80 ? (
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-dm font-medium bg-[#00d9a3]/10 text-[#00d9a3] border border-[#00d9a3]/20">
                                        <span className="w-2 h-2 rounded-full bg-[#00d9a3]" /> High Accuracy ({confidence}%)
                                    </span>
                                ) : confidence >= 60 ? (
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-dm font-medium bg-[#f0a500]/10 text-[#f0a500] border border-[#f0a500]/20">
                                        <span className="w-2 h-2 rounded-full bg-[#f0a500]" /> Good — try better lighting to improve ({confidence}%)
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-dm font-medium bg-[#ff4757]/10 text-[#ff4757] border border-[#ff4757]/20">
                                        <span className="w-2 h-2 rounded-full bg-[#ff4757]" /> Low — retake in brighter conditions ({confidence}%)
                                    </span>
                                )}
                            </div>
                        )}
                    </GlassCard>

                    <div className="flex gap-3 mb-4">
                        {!isReading ? (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleReadAndFeel}
                                className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-3 text-lg font-dm font-bold bg-white text-black shadow-[0_8px_32px_rgba(255,255,255,0.15)]"
                            >
                                <Play size={20} fill="currentColor" />
                                Read & Feel
                            </motion.button>
                        ) : (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleStopReading}
                                className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-3 text-lg font-dm font-bold bg-[#ff4757] text-white shadow-[0_8px_32px_rgba(255,71,87,0.25)]"
                            >
                                <Square size={18} fill="currentColor" />
                                Stop Playing
                            </motion.button>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCopy}
                            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-dm font-medium bg-white/5 border border-white/10 text-white"
                        >
                            <Copy size={16} />
                            Copy Text
                        </motion.button>

                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleScanAgain}
                            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-dm font-medium bg-white/5 border border-white/10 text-white"
                        >
                            <RotateCcw size={16} />
                            Scan Again
                        </motion.button>
                    </div>

                </motion.div>
            )}
        </motion.div>
    );
}
