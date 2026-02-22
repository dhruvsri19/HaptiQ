import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import { vibrate, speak, stop } from '../lib/haptics';
import { wordToVibration } from '../lib/braille';
import useStore from '../store/useStore';
import { Camera, ScanText, Play, Square, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';

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

// ── Memory-safe canvas preprocessing ────────────────────────
function preprocessImage(blobOrUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas 2D context unavailable'));

                // Memory-safe scaling — fit within 1600px on longest side
                let w = img.width;
                let h = img.height;
                const longest = Math.max(w, h);
                if (longest > 2000) {
                    const scale = 1600 / longest;
                    w = Math.round(w * scale);
                    h = Math.round(h * scale);
                }
                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);

                const imageData = ctx.getImageData(0, 0, w, h);
                const pixels = imageData.data;

                // Grayscale
                for (let i = 0; i < pixels.length; i += 4) {
                    const gray = Math.round(
                        0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
                    );
                    pixels[i] = gray;
                    pixels[i + 1] = gray;
                    pixels[i + 2] = gray;
                }

                // Contrast stretch
                let min = 255;
                let max = 0;
                for (let i = 0; i < pixels.length; i += 4) {
                    const v = pixels[i];
                    if (v < min) min = v;
                    if (v > max) max = v;
                }
                const range = max - min || 1;
                for (let i = 0; i < pixels.length; i += 4) {
                    const stretched = Math.round(((pixels[i] - min) / range) * 255);
                    const clamped = Math.max(0, Math.min(255, stretched));
                    pixels[i] = clamped;
                    pixels[i + 1] = clamped;
                    pixels[i + 2] = clamped;
                }

                // Binarize — threshold at 128
                for (let i = 0; i < pixels.length; i += 4) {
                    const bw = pixels[i] > 128 ? 255 : 0;
                    pixels[i] = bw;
                    pixels[i + 1] = bw;
                    pixels[i + 2] = bw;
                }

                ctx.putImageData(imageData, 0, 0);

                // Promisified toBlob
                const getProcessedBlob = (c) =>
                    new Promise((res) => {
                        c.toBlob((blob) => res(blob), 'image/png', 1.0);
                    });

                getProcessedBlob(canvas).then((blob) => {
                    const processedPreview = canvas.toDataURL('image/png');
                    resolve({ blob, previewUrl: processedPreview });
                });
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = () => reject(new Error('Failed to load image for preprocessing'));
        // Accept both blob URLs and data URLs
        if (blobOrUrl instanceof Blob) {
            img.src = URL.createObjectURL(blobOrUrl);
        } else {
            img.src = blobOrUrl;
        }
    });
}

// ── Post-processing for extracted text ──────────────────────
function cleanOcrText(raw) {
    let text = raw;
    text = text.replace(/[^a-zA-Z0-9\s.,!?'"():;\-/]/g, '');
    text = text.replace(/\s+/g, ' ');
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
}

// ── Confidence badge ────────────────────────────────────────
function ConfidenceBadge({ confidence }) {
    let color, bg, label;
    if (confidence > 70) {
        color = '#00d9a3';
        bg = 'rgba(0, 217, 163, 0.12)';
        label = 'High confidence';
    } else if (confidence >= 40) {
        color = '#f0a500';
        bg = 'rgba(240, 165, 0, 0.12)';
        label = 'Medium confidence — retake in better lighting';
    } else {
        color = '#ff4757';
        bg = 'rgba(255, 71, 87, 0.12)';
        label = 'Low confidence — try better lighting or a flatter angle';
    }
    return (
        <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-dm font-medium mt-4"
            style={{ background: bg, color, border: `1px solid ${color}33` }}
        >
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
            {label} ({Math.round(confidence)}%)
        </div>
    );
}

export default function SnapOCR() {
    // Preview URL from createObjectURL (for display only)
    const [previewUrl, setPreviewUrl] = useState(null);
    // Actual File object kept for passing to preprocessor/tesseract
    const [capturedFile, setCapturedFile] = useState(null);
    const [processedSrc, setProcessedSrc] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playIndex, setPlayIndex] = useState(0);
    const [totalWords, setTotalWords] = useState(0);
    const [scanError, setScanError] = useState(null);

    // (1) Camera input ref
    const cameraInputRef = useRef(null);
    const playIntervalRef = useRef(null);
    // (4) Worker ref for cleanup on unmount
    const workerRef = useRef(null);

    const logPractice = useStore((s) => s.logPractice);

    // Persist OCR results in zustand so remounts don't lose data
    const ocrText = useStore((s) => s._ocrText || '');
    const confidence = useStore((s) => s._ocrConfidence ?? null);
    const setOcrText = (text) => useStore.setState({ _ocrText: text });
    const setConfidence = (val) => useStore.setState({ _ocrConfidence: val });

    // (3) Revoke previous blob URL when a new one is created
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    // (4) Terminate worker on unmount (AnimatePresence exit safety)
    useEffect(() => {
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, []);

    // (2) Safe handleCapture — validates type, size, resets input
    const handleCapture = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setScanError('Please select an image file');
            return;
        }
        const maxBytes = 15 * 1024 * 1024;
        if (file.size > maxBytes) {
            setScanError('Image too large. Please use a smaller photo.');
            return;
        }
        setScanError(null);
        setOcrText('');
        setConfidence(null);
        setProcessedSrc(null);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setCapturedFile(file);
        // Reset so the same file can be re-selected
        e.target.value = '';
    }, []);

    const handleScan = useCallback(async () => {
        if (!capturedFile || isScanning) return;
        setIsScanning(true);
        setScanProgress(0);
        setScanError(null);

        try {
            // Preprocess — wrapped in full try/catch
            let processedBlob = null;
            try {
                const result = await preprocessImage(capturedFile);
                if (result.blob) {
                    processedBlob = result.blob;
                    setProcessedSrc(result.previewUrl);
                }
            } catch (preprocessErr) {
                console.warn('Preprocessing failed, falling back to raw image:', preprocessErr);
            }

            // (5) Create worker with throttled progress logger
            let lastProgressUpdate = 0;
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker('eng', 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        const now = Date.now();
                        if (now - lastProgressUpdate > 200) {
                            setScanProgress(Math.floor(m.progress * 100));
                            lastProgressUpdate = now;
                        }
                    }
                },
            });

            // Store in ref for unmount cleanup
            workerRef.current = worker;

            // Set accuracy params
            await worker.setParameters({
                tessedit_char_whitelist:
                    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?\'"\\-:;()/ ',
                tessedit_pageseg_mode: '6',
                preserve_interword_spaces: '1',
            });

            // Pass preprocessed blob, or fall back to raw file
            const ocrInput = processedBlob || capturedFile;
            const { data } = await worker.recognize(ocrInput);

            const cleaned = cleanOcrText(data.text);
            setOcrText(cleaned || 'No readable text found. Try better lighting or a flatter angle.');
            setConfidence(data.confidence);
            // Final progress
            setScanProgress(100);
        } catch (err) {
            console.error('OCR error:', err);
            setScanError(
                `Scan failed: ${err.message || 'Unknown error'}. Try better lighting or a smaller image.`
            );
            setOcrText('');
            setConfidence(null);
        } finally {
            // Always terminate worker in finally
            if (workerRef.current) {
                try {
                    await workerRef.current.terminate();
                } catch (_) {
                    /* swallow */
                }
                workerRef.current = null;
            }
            setIsScanning(false);
        }
    }, [capturedFile, isScanning]);

    const handleReadAndFeel = useCallback(() => {
        if (!ocrText || isPlaying) return;
        const words = ocrText.split(/\s+/).filter(Boolean);
        if (words.length === 0) return;

        setIsPlaying(true);
        setPlayIndex(0);
        setTotalWords(words.length);

        let index = 0;

        const playNext = () => {
            if (index >= words.length) {
                setIsPlaying(false);
                stop();
                return;
            }

            const word = words[index].toLowerCase().replace(/[^a-z0-9\s]/g, '');
            setPlayIndex(index + 1);

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
    }, [ocrText, isPlaying, logPractice]);

    const handleStop = useCallback(() => {
        setIsPlaying(false);
        stop();
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (playIntervalRef.current) clearTimeout(playIntervalRef.current);
    }, []);

    const handleReset = useCallback(() => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setCapturedFile(null);
        setProcessedSrc(null);
        setOcrText('');
        setConfidence(null);
        setScanError(null);
        setScanProgress(0);
        handleStop();
    }, [handleStop, previewUrl]);

    // Show processed B&W preview if available, otherwise original
    const displaySrc = processedSrc || previewUrl;

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="page-content px-4 pb-24"
        >
            <motion.div variants={itemVariants} className="mb-10 mt-6">
                <h2 className="font-syne text-[2.5rem] tracking-tighter mb-2 leading-none text-white">
                    Snap & Read
                </h2>
                <p className="text-base font-dm text-[#555555]">
                    Capture reality. Process text instantly.
                </p>
            </motion.div>

            {/* Camera Capture Section */}
            {!previewUrl ? (
                <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-12">
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={isScanning}
                        className="relative w-36 h-36 rounded-full flex items-center justify-center bg-black border-[4px] border-[#6c63ff] outline-none disabled:opacity-50"
                        style={{
                            boxShadow:
                                '0 0 60px rgba(108, 99, 255, 0.4), inset 0 0 20px rgba(108, 99, 255, 0.2)',
                            WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        <div className="absolute inset-2 rounded-full border border-white/10" />
                        <Camera size={44} style={{ color: '#EDEDED' }} />
                    </motion.button>
                    <p className="mt-8 text-xs tracking-widest uppercase font-dm text-[#555555]">
                        Tap to Capture
                    </p>
                </motion.div>
            ) : (
                <motion.div variants={itemVariants} className="w-full">
                    {/* Edge-to-edge Preview */}
                    <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden mb-6 bg-black border border-white/[0.05] shadow-2xl">
                        <img
                            src={displaySrc}
                            alt="Captured"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/60 pointer-events-none" />

                        <button
                            onClick={handleReset}
                            disabled={isScanning}
                            className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-xs font-dm text-white border border-white/10 disabled:opacity-50"
                        >
                            Retake
                        </button>

                        {processedSrc && (
                            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-dm text-[#00d9a3] border border-[#00d9a3]/20">
                                Preprocessed
                            </div>
                        )}
                    </div>

                    {/* Scan Action */}
                    {!ocrText && !scanError && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            onClick={handleScan}
                            disabled={isScanning}
                            className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-lg font-dm font-bold disabled:opacity-50"
                            style={{
                                background: 'white',
                                color: 'black',
                                boxShadow: '0 8px 32px rgba(255,255,255,0.15)',
                            }}
                        >
                            {isScanning ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Scanning... {scanProgress}%
                                </>
                            ) : (
                                <>
                                    <ScanText size={20} />
                                    Process Text
                                </>
                            )}
                        </motion.button>
                    )}

                    {/* Scan Progress Bar */}
                    {isScanning && (
                        <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden mt-4">
                            <motion.div
                                className="h-full bg-[#EDEDED]"
                                initial={{ width: 0 }}
                                animate={{ width: `${scanProgress}%` }}
                                transition={{ ease: 'linear' }}
                            />
                        </div>
                    )}
                </motion.div>
            )}

            {/* (1) Hidden camera input — always in DOM */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleCapture}
            />

            {/* Error State */}
            {scanError && (
                <motion.div variants={itemVariants} className="mt-4">
                    <GlassCard
                        className="p-6"
                        hover={false}
                        style={{
                            borderColor: 'rgba(255, 71, 87, 0.2)',
                            background: 'rgba(255, 71, 87, 0.06)',
                        }}
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <AlertTriangle
                                size={20}
                                className="flex-shrink-0 mt-0.5"
                                style={{ color: '#ff4757' }}
                            />
                            <p className="font-dm text-sm text-[#ff4757] leading-relaxed">
                                {scanError}
                            </p>
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            onClick={handleReset}
                            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-dm font-bold bg-white/[0.05] border border-white/[0.08] text-[#EDEDED]"
                        >
                            <RotateCcw size={16} />
                            Try Again
                        </motion.button>
                    </GlassCard>
                </motion.div>
            )}

            {/* Extracted Text Details */}
            {ocrText && (
                <motion.div variants={itemVariants} className="mt-2">
                    <GlassCard className="mb-6 p-6" hover={false}>
                        <p className="text-xs font-dm mb-4 tracking-widest uppercase text-[#555555]">
                            Extracted Text
                        </p>
                        <div className="font-dm text-base leading-relaxed text-[#EDEDED] max-h-[180px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {ocrText}
                        </div>
                        {confidence !== null && <ConfidenceBadge confidence={confidence} />}
                    </GlassCard>

                    {/* Action Dock */}
                    <div className="flex gap-3">
                        {!isPlaying ? (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                onClick={handleReadAndFeel}
                                className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-3 text-lg font-dm font-bold bg-white text-black shadow-[0_8px_32px_rgba(255,255,255,0.15)]"
                            >
                                <Play size={20} fill="currentColor" />
                                Read & Feel
                            </motion.button>
                        ) : (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                onClick={handleStop}
                                className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-3 text-lg font-dm font-bold bg-[#ff4757] text-white shadow-[0_8px_32px_rgba(255,71,87,0.25)]"
                            >
                                <Square size={18} fill="currentColor" />
                                Stop Playing
                            </motion.button>
                        )}
                    </div>

                    {isPlaying && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center text-xs font-dm mt-6 tracking-widest uppercase text-[#555555]"
                        >
                            Word {playIndex} of {totalWords}
                        </motion.p>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
}
