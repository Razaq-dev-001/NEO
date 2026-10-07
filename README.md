# 🤖 NEO — 3D Interactive Personal AI Robot Companion

> A living, animated, interactive 3D AI companion designed for macOS, powered by **Three.js**, **React Three Fiber**, **Google Gemini AI**, **Web Speech & Audio APIs**, and **Electron**.

---

## 🌟 Overview

**NEO** is not a static chatbot or decorative robot image. NEO is a fully rendered, living 3D character residing on your Mac with:
- **Procedural Rigged 3D Character**: Smooth white lacquer spherical body, floating rounded head, glossy OLED face visor screen, expressive cyan glowing eyes, mouth equalizer, poseable arms, and anti-gravity thruster pods with dynamic particle sparks.
- **Dynamic Animation Engine**: Continuous 60fps state machine handling **Idle** (floating hover, breathing, eye saccades, random blinking), **Listening** (head tilt, focus forward), **Thinking** (eyes darting, inquisitive angle), **Speaking** (mouth visemes, conversational gestures), **Happy / Excited** (thruster bouncing, raised arms), **Waving** (hand wave), **Dancing** (body spin, twirls, rhythmic beats), **Jumping** (crouch + high spring), **Walking** (strides across 3D coordinates), **Sleeping** (closed slit eyes + floating Zzz particles), and smooth lerp/slerp pose transitions.
- **Voice Intelligence**: Full two-way voice interaction with Web Speech API STT, wake-phrase detection ("Hey NEO"), interruptible TTS speech synthesis, audio frequency visualizers, and Web Audio API synthesized sound effects.
- **Gemini AI Core**: Powered by Google's Gemini multimodal models with automatic intent recognition, tool calling, and intelligent fallback companion persona.
- **Personal Memory Vault**: Persistent SQLite database via WebAssembly SQL.js storing your name, preferences, ongoing projects, and custom facts across application restarts with full inspection UI.
- **Personal Daily Assistant**: Task management system with priorities, dates, times, reminders, and local desktop notifications. NEO can read your daily schedule aloud.
- **Live News & Weather**: Real-time RSS feeds (Tech, AI, World, India, Business) with headline extractions and live meteorology data from Open-Meteo.
- **macOS Desktop Companion Mode**: Electron wrapper with always-on-top mode, compact companion widget, global summon shortcut (`Option+Shift+N`), and smooth window controls.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0 or higher (v20+ recommended)
- **npm**: v9.0 or higher

### 2. Setup Environment Variables
Copy `.env.example` to `.env` (optional, NEO includes full built-in offline intelligence and in-app settings configuration):
```bash
cp .env.example .env
```
Add your Google Gemini API key to `.env` or paste it directly inside the app's **Settings** drawer:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Launching NEO

#### Option A: Web Mode (Fast Browser Interface)
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

#### Option B: Native macOS Desktop Application (Electron)
```bash
npm run electron:dev
```

#### Option C: Production Build
```bash
npm run build
```

---

## 🎙️ Natural Voice & Action Commands

You can speak or type commands to NEO:

| Command Category | Example Voice Commands | Robot Behavior |
| :--- | :--- | :--- |
| **Physical 3D Gestures** | *"Hey NEO, wave your hand"*<br>*"Start dancing"*<br>*"Jump high"*<br>*"Clap your hands"* | Raises arm and waves<br>Spins, bobs, and twirls arms with music notes<br>Crouches and engages thrusters upward<br>Applauds in front of chest |
| **Spatial Movement** | *"Walk to the left side"*<br>*"Go to the right"*<br>*"Come closer"*<br>*"Step back"*<br>*"Reset position"* | Walks across 3D coordinates (-1.8 to +1.8)<br>Walks to right with arm swings<br>Floats closer to the screen (Z: +1.2)<br>Returns to default center position |
| **Daily Tasks** | *"Add a task to practice Java DSA at 6 PM"*<br>*"What are my tasks today?"*<br>*"Show my pending tasks"* | Adds task to SQLite database and sets reminder<br>Reads your daily schedule aloud<br>Opens Tasks drawer with priority filters |
| **Memory Vault** | *"My name is Razaq"*<br>*"Remember that I love coding in TypeScript"*<br>*"What is my name?"* | Extracts and stores identity in SQLite<br>Stores fact in Memory Vault<br>Recalls: *"You're Razaq!"* with a wave |
| **Live Information** | *"What is happening in the world today?"*<br>*"Give me tech news"*<br>*"What is the weather like?"*<br>*"What time is it?"* | Fetches real-time RSS feeds and gives a spoken briefing<br>Fetches live Open-Meteo weather for your city<br>Tells precise local time |
| **Companion States** | *"Go to sleep"*<br>*"Wake up NEO"*<br>*"Tell me a joke"*<br>*"I'm tired"* | Enters sleep pose with floating Zzz<br>Energizes with happy crescent eyes<br>Tells a programming joke & dances<br>Offers caring encouragement & advice |

---

## 🏗️ Architecture Overview

```
NEO/
├── electron/
│   ├── main.ts              # Native macOS window lifecycle, tray, global shortcuts, IPC
│   ├── preload.ts           # Secure contextBridge API
│   └── tsconfig.json
├── src/
│   ├── components/
│   │   ├── 3d/
│   │   │   ├── RobotCanvas.tsx       # R3F Canvas, OrbitControls, camera tracking
│   │   │   ├── RobotMesh.tsx         # Procedural rigged 3D Robot mesh with FK kinematics
│   │   │   ├── VisorScreen.tsx       # Dynamic procedural OLED visor eye & mouth canvas
│   │   │   ├── RobotParticles.tsx    # Thruster particles & 3D floating emotes (Zzz, music, hearts)
│   │   │   └── StudioEnvironment.tsx # Studio lights, contact shadows, cyber pedestal
│   │   └── ui/
│   │       ├── HeaderHUD.tsx         # Status bar, time/date, drawer triggers, mode toggles
│   │       ├── CommandBar.tsx        # Microphone button, prompt field, suggestion chips
│   │       ├── SpeechTranscriptBubble.tsx # Dialogue bubble, interrupt/stop button
│   │       ├── VoiceVisualizer.tsx   # Cybernetic pulsing audio ring
│   │       ├── TaskDrawer.tsx        # Daily task manager, priority filters, schedule reader
│   │       ├── MemoryDrawer.tsx      # Personal memory vault & search
│   │       ├── NewsDrawer.tsx        # Real RSS news feeds & live weather forecast
│   │       ├── SettingsModal.tsx     # Gemini config, voice calibration, shortcuts
│   │       └── QuickActionsHUD.tsx   # Floating physical action triggers
│   ├── services/
│   │   ├── aiService.ts             # Gemini API client + system prompt + local engine
│   │   ├── speechService.ts         # STT recognition, wake phrase, TTS with viseme hooks
│   │   ├── intentParser.ts          # Instant regex & semantic command router
│   │   ├── dbService.ts             # WebAssembly SQLite database with localStorage backup
│   │   ├── newsService.ts           # Live RSS feed parser (Tech, AI, World, India)
│   │   ├── weatherService.ts        # Open-Meteo live weather data service
│   │   ├── reminderService.ts       # Background task alert scheduler & notifications
│   │   └── audioSynthesizer.ts      # Web Audio API procedural futuristic sound FX
│   └── state/
│       ├── robotStore.ts            # Animation state machine, coordinates, emotes
│       ├── conversationStore.ts     # Chat history, live transcripts, speaking state
│       ├── taskStore.ts             # Daily assistant tasks state
│       ├── memoryStore.ts           # Memory vault state
│       └── settingsStore.ts         # User preferences, API keys, voices
```

---

## ⌨️ Global macOS Keybindings

- **Summon / Focus NEO**: `Option + Shift + N` (`⌥ + ⇧ + N`)
- **Close Open Drawers / Reset**: `Escape`
- **Toggle Voice Mic**: Click the glowing mic button or trigger via voice wake phrase.

---

## 🛡️ Privacy & Local Persistence

- All tasks, memories, preferences, and conversations are stored locally in your SQLite database.
- Microphone is activated only on user interaction or explicit wake word detection.
- Audio synthesis runs locally using the macOS Web Audio and Speech Synthesis engines.
