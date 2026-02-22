import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import Home from './pages/Home';
import BrailleTyper from './pages/BrailleTyper';
import DiagramExplorer from './pages/DiagramExplorer';
import SnapOCR from './pages/SnapOCR';
import Analytics from './pages/Analytics';

export default function App() {
    return (
        <BrowserRouter>
            <div className="relative z-10 w-full h-full">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/braille" element={<BrailleTyper />} />
                    <Route path="/diagram" element={<DiagramExplorer />} />
                    <Route path="/ocr" element={<SnapOCR />} />
                    <Route path="/analytics" element={<Analytics />} />
                </Routes>
                <Nav />
            </div>
        </BrowserRouter>
    );
}
