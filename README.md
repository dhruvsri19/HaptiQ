<div align="center">

# HaptiQ

**Democratizing Education for the Visually Impaired**

*A zero-cost, offline-first Progressive Web App that transforms standard Android smartphones into full-featured assistive learning devices — repurposing the vibration motor, camera, and speaker that students already carry in their pockets.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline--First-brightgreen)](https://web.dev/progressive-web-apps/)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA-blueviolet)](https://www.w3.org/TR/WCAG21/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)](https://vitejs.dev/)

</div>

---

## Table of Contents

- [Overview](#overview)
- [The Problem](#the-problem)
- [Core Features](#core-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [PWA Installation (Android)](#pwa-installation-android)
- [Browser Compatibility](#browser-compatibility)
- [Accessibility](#accessibility)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

HaptiQ (formerly Vibe-Learn) is a **multimodal, tactile learning platform** designed for visually impaired and low-vision students in developing nations. The application repurposes three hardware components present in every modern budget smartphone — the vibration motor, rear camera, and speaker — to deliver a learning experience that previously required specialized equipment costing upwards of **$2,000 USD**.

HaptiQ runs entirely on the client device. No backend server is required. Once installed as a PWA, the application operates with **full offline capability**, making it viable for students in areas with little or no internet connectivity.

> **Hackathon Track:** Education & Accessibility
> **Target Platform:** Android (Chrome) — budget devices, $50–$80 USD price range
> **UN SDG Alignment:** Goal 4 — Quality Education

---

## The Problem

An estimated **253 million people** worldwide live with visual impairment. Of these, approximately **90% reside in low- and middle-income countries** where access to specialized assistive education technology is effectively nonexistent:

| Barrier | Description |
|---|---|
| **Cost** | Refreshable Braille displays cost $500–$5,000 USD. Braille textbooks cost $50–$200 per title. |
| **Content** | The global Braille catalog covers fewer than 5% of published titles. Curricula-aligned textbooks are rarely available. |
| **Connectivity** | Cloud-based screen readers and online resources are inaccessible in areas with no reliable internet. |
| **Geography** | Specialist teachers trained in visual impairment pedagogy are concentrated in urban centers, far from rural students. |

HaptiQ addresses all four barriers simultaneously with software that runs on a device students already own.

---

## Core Features

### 1. Multimodal Braille Translator
Converts typed text into simultaneous **haptic Braille pulse patterns** and **text-to-speech audio**. Each character is encoded as a millisecond-precision vibration array mapped to a Grade 1 Braille cell pattern and delivered via the [Web Vibration API](https://www.w3.org/TR/vibration/). Speech output fires in parallel via the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API), reinforcing information across two sensory channels.

### 2. Tactile Diagram Explorer (Vibe-Map)
Renders uploaded images onto an HTML5 Canvas. As the user moves a finger across the touchscreen, the app reads pixel luminance values at the touch coordinate in real time. Dark pixels (edges, borders, lines) trigger micro-vibrations — allowing a student to **feel the structure of a diagram** with their fingertip.

- **Detail Slider** — Adjusts the luminance threshold for edge detection, reducing false positives on low-contrast or noisy images.
- **Audio Hotspots** — Tesseract.js performs an OCR pass on image load to detect text labels. Label regions are masked on the canvas and converted into audio hotspots: when a user's finger enters that region, vibration is suppressed and the label is spoken aloud.

### 3. Snapshot-to-Touch OCR Scanner
Enables students to **read physical worksheets independently**. The app opens the device's rear camera via the native file capture API. The captured photo is processed entirely client-side by Tesseract.js (WebAssembly, offline). Extracted text is played back word-by-word with synchronized haptic Braille vibration and TTS audio.

---

## Technology Stack

| Category | Technology | Notes |
|---|---|---|
| Frontend Framework | React 18 (Vite) | Component-based UI; optimized PWA bundle output |
| Styling | Tailwind CSS + Custom CSS | Glassmorphism design system with WCAG-compliant overrides |
| Haptic Output | Web Vibration API (`navigator.vibrate`) | Native browser API; no dependencies required |
| Audio Output | Web Speech API (`window.speechSynthesis`) | Offline TTS; 100+ language voices |
| Graphics | HTML5 Canvas API | Pixel-level RGBA access for edge detection |
| Client-Side ML / OCR | Tesseract.js v4 | WASM port of Tesseract; fully offline; 100+ languages |
| PWA | vite-plugin-pwa (Workbox) | Service Worker, Web App Manifest, pre-caching strategy |
| Typography | Syne + DM Sans | Pre-cached via Google Fonts; high-legibility at all sizes |

---

## Architecture

HaptiQ is a **pure client-side application**. No application server, database, or cloud service is involved at any point. All ML inference, Braille translation, and haptic output run entirely on the user's device.

```
┌──────────────────────────────────────────────────────┐
│                  User's Android Device                │
│                                                      │
│   React PWA (Vite)                                   │
│   ┌──────────────────┐   ┌──────────────────┐        │
│   │  Braille         │   │  Vibe-Map        │        │
│   │  Translator      │   │  Diagram Explorer│        │
│   └────────┬─────────┘   └────────┬─────────┘        │
│            │                      │                  │
│   ┌────────┴──────────────────────┴──────────────┐   │
│   │              Browser APIs                    │   │
│   │  navigator.vibrate  |  speechSynthesis       │   │
│   │  Canvas API         |  File Capture API      │   │
│   │  Tesseract.js WASM  |  Service Worker Cache  │   │
│   └──────────────────────────────────────────────┘   │
│                                                      │
│   ┌──────────────────┐                               │
│   │  OCR Scanner     │  ← Camera → Tesseract.js      │
│   └──────────────────┘     (all local, no upload)    │
└──────────────────────────────────────────────────────┘
```

The Service Worker pre-caches all application assets — including the Tesseract.js WebAssembly binary and language training data — on first install. Every subsequent use is entirely offline.

---

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn
- A physical Android device with Chrome for testing haptic features
- HTTPS context required locally for the Web Vibration API and Camera API (`localhost` is treated as a secure context by Chrome)

### Installation

```bash
# Clone the repository
git clone https://github.com/[your-org]/haptiq.git
cd haptiq

# Install dependencies
npm install

# Start the development server
npm run dev
```

The development server will be available at `https://localhost:5173`.

### Production Build

```bash
npm run build
```

The optimized output is written to `/dist`. The Vite PWA plugin automatically generates the Service Worker (`sw.js`) and Web App Manifest (`manifest.webmanifest`). The `/dist` directory can be deployed to any static file host with no additional configuration.

### Recommended Deployment Platforms

| Platform | Cost | Notes |
|---|---|---|
| Vercel / Netlify | Free tier | Zero-config deployment via git push. Recommended for demo and MVP. |
| Cloudflare Pages | Free generous tier | Global CDN edge delivery. Recommended for production scale. |
| GitHub Pages | Free | Manual Service Worker path configuration required. |
| Local School Intranet | Infrastructure only | Serve via local WiFi hotspot for schools with no internet access. |

---

## PWA Installation (Android)

1. Open the HaptiQ URL in **Chrome for Android**.
2. Wait for the **"Add to Home Screen"** prompt, or access it manually via the browser menu.
3. Confirm installation. The HaptiQ icon will appear on the home screen.
4. Launch from the home screen. The app runs in **standalone mode** (no browser chrome).
5. On first launch, the Service Worker pre-caches all assets, including the Tesseract.js WASM binary and language data. The application is now **fully functional offline**.

> **Note:** The Web Vibration API requires a user gesture before the first call. HaptiQ handles this automatically by binding vibration calls to explicit user interactions.

---

## Browser Compatibility

The haptic core of HaptiQ depends on the Web Vibration API, which is supported on Android Chrome and Firefox but is intentionally disabled by Apple on iOS Safari.

| API | Android Chrome | Firefox Android | iOS Safari | Desktop Chrome |
|---|:---:|:---:|:---:|:---:|
| Web Vibration API | ✅ | ✅ | ❌ | ❌ |
| Web Speech API (TTS) | ✅ | ✅ | ✅ | ✅ |
| HTML5 Canvas | ✅ | ✅ | ✅ | ✅ |
| File Capture (Camera) | ✅ | ✅ | ✅ | ⚠️ Partial |
| Service Worker (PWA) | ✅ | ✅ | ✅ | ✅ |

> iOS users retain access to all **Text-to-Speech and OCR** functionality. Haptic features are unavailable on iOS pending a native wrapper (see [Roadmap](#roadmap)).

---

## Accessibility

Accessibility is the primary design constraint of HaptiQ, not a post-hoc consideration. The application targets **WCAG 2.1 AA** compliance throughout.

- **Touch Targets** — All interactive elements have a minimum height of 64px (`h-16`), exceeding the WCAG 2.5.5 minimum of 44px.
- **Colour Contrast** — Primary body text achieves approximately 12:1 contrast ratio against the application background, exceeding the WCAG AA requirement of 4.5:1.
- **Haptic Navigation Feedback** — Every navigation interaction fires a micro-vibration (`navigator.vibrate([30])`), providing non-visual confirmation of registered input.
- **ARIA Support** — All non-text interactive elements include `aria-label` attributes. Live regions (`aria-live="polite"`) announce status changes without interrupting the current task.
- **Screen Reader Compatibility** — All primary flows are operable via TalkBack (Android) and VoiceOver (iOS) in addition to HaptiQ's own audio output system.
- **Multimodal Redundancy** — Every piece of information is communicated through a minimum of two simultaneous channels (haptic + audio), ensuring comprehension regardless of the reliability of either individual sense.

---

## Project Structure

```
haptiq/
├── public/
│   ├── icons/                   # PWA icons (48px–512px)
│   └── manifest.webmanifest     # Generated by vite-plugin-pwa
├── src/
│   ├── components/
│   │   ├── BrailleTranslator/   # Module 1 — Haptic Braille + TTS
│   │   ├── VibeMap/             # Module 2 — Tactile Diagram Explorer
│   │   └── Scanner/             # Module 3 — Snapshot OCR Reader
│   ├── data/
│   │   └── brailleMap.js        # Grade 1 Braille character → vibration array dictionary
│   ├── hooks/
│   │   ├── useVibration.js      # Web Vibration API abstraction
│   │   └── useSpeech.js         # Web Speech API abstraction
│   ├── styles/
│   │   └── globals.css          # Glassmorphism design system + A11y overrides
│   ├── App.jsx
│   └── main.jsx
├── vite.config.js               # Vite + PWA plugin configuration
├── tailwind.config.js
└── package.json
```

---

## Roadmap

### Phase 1 — Polish *(0–3 Months)*
- [ ] Multi-language Braille support (Hindi, Tamil, Arabic, Swahili)
- [ ] Grade 2 contracted Braille encoding for faster haptic reading
- [ ] UI localization into Hindi, Swahili, and Portuguese
- [ ] Tesseract.js WASM caching via IndexedDB for sub-second subsequent loads

### Phase 2 — Scale *(3–9 Months)*
- [ ] Native Android app via Trusted Web Activity (TWA) for Play Store distribution
- [ ] iOS haptic support via React Native port or CoreHaptics bridge
- [ ] Curriculum-aligned Braille lesson packs (India CBSE, Kenya CBC)
- [ ] Teacher dashboard for session tracking and custom diagram library management

### Phase 3 — Ecosystem *(9–24 Months)*
- [ ] Community-sourced tactile diagram library with educator review
- [ ] AI-enhanced OCR model fine-tuned for handwritten worksheet recognition
- [ ] Government partnerships for pre-installation on subsidized student devices
- [ ] Hardware tier: partnerships with device manufacturers for enhanced haptic motor specifications

---

## Contributing

Contributions are welcome. Please follow the process below:

1. **Fork** the repository and create a feature branch from `main`.
2. Ensure all changes are tested on a physical Android device — emulators do not support the Web Vibration API.
3. Verify that any UI changes maintain or improve WCAG 2.1 AA compliance.
4. Submit a **Pull Request** with a clear description of the change, its motivation, and any relevant screenshots or screen recordings.

For significant changes, please open an issue first to discuss the proposed approach.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for full details.

---

<div align="center">

*Built to give every student the right to read.*

</div>
