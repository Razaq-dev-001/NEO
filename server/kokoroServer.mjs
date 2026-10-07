// Kokoro TTS Local Node Service on Apple Silicon
import http from 'http';
import { KokoroTTS } from 'kokoro-js';

const PORT = parseInt(process.env.KOKORO_PORT || '5182', 10);
let ttsInstance = null;
let isModelLoading = false;
let modelLoadError = null;

// Catch all global exceptions to prevent unexpected exits
process.on('uncaughtException', (err) => {
  console.error('[KokoroServer] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.warn('[KokoroServer] Unhandled Rejection:', reason);
});

// Warm up and initialize the model
async function getTTS() {
  if (ttsInstance) return ttsInstance;
  if (isModelLoading) {
    while (isModelLoading) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (ttsInstance) return ttsInstance;
  }

  try {
    isModelLoading = true;
    console.log('[KokoroServer] Initializing Kokoro-82M ONNX model on Apple Silicon...');
    const t0 = Date.now();
    ttsInstance = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
      dtype: 'q8',
    });
    console.log(`[KokoroServer] Model loaded successfully in ${Date.now() - t0}ms!`);
    modelLoadError = null;
    return ttsInstance;
  } catch (err) {
    console.error('[KokoroServer] Failed to load Kokoro model:', err);
    modelLoadError = err.message || 'Model load failure';
    throw err;
  } finally {
    isModelLoading = false;
  }
}

// Pre-load in background without blocking server startup
getTTS().catch((e) => console.warn('[KokoroServer] Initial pre-load deferred:', e.message));

const KOKORO_VOICES = [
  { id: 'af_heart', name: 'Heart (Warm & Youthful)', gender: 'Female', traits: '❤️ Natural & Expressive', rating: 'Grade A' },
  { id: 'af_bella', name: 'Bella (Energetic & Lively)', gender: 'Female', traits: '🔥 Cheerful & Dynamic', rating: 'Grade A-' },
  { id: 'af_nicole', name: 'Nicole (Chill & Conversational)', gender: 'Female', traits: '🎧 Relaxed & Smooth', rating: 'Grade B+' },
  { id: 'af_sarah', name: 'Sarah (Soft & Sweet)', gender: 'Female', traits: '🌸 Gentle & Warm', rating: 'Grade B+' },
  { id: 'af_sky', name: 'Sky (Playful & Light)', gender: 'Female', traits: '☁️ Upbeat & Crisp', rating: 'Grade B' },
  { id: 'am_adam', name: 'Adam (Youthful Male)', gender: 'Male', traits: '👦 Friendly & Active', rating: 'Grade B' },
  { id: 'am_michael', name: 'Michael (Warm Male)', gender: 'Male', traits: '🎙️ Clear & Natural', rating: 'Grade B+' },
  { id: 'bf_emma', name: 'Emma (British Companion)', gender: 'Female', traits: '🇬🇧 Elegant & Cheerful', rating: 'Grade B+' },
];

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Health check endpoint
  if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/api/tts/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: ttsInstance ? 'ready' : isModelLoading ? 'loading' : 'offline',
        model: 'Kokoro-82M-v1.0-ONNX',
        error: modelLoadError,
        ready: Boolean(ttsInstance),
        defaultVoice: 'af_heart',
        voicesCount: KOKORO_VOICES.length,
      })
    );
    return;
  }

  // Voices list endpoint
  if (req.method === 'GET' && (url.pathname === '/voices' || url.pathname === '/api/tts/voices')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ voices: KOKORO_VOICES }));
    return;
  }

  // Synthesize endpoint
  if (req.method === 'POST' && (url.pathname === '/synthesize' || url.pathname === '/api/tts/synthesize')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const text = (payload.text || '').trim();
        const voice = payload.voice || 'af_heart';
        const speed = parseFloat(payload.speed) || 1.0;

        if (!text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Text parameter is required' }));
          return;
        }

        const tts = await getTTS();
        const t0 = Date.now();
        const audio = await tts.generate(text, {
          voice,
          speed: Math.max(0.6, Math.min(1.6, speed)),
        });

        const wavBlob = audio.toBlob();
        const arrayBuffer = await wavBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(
          `[KokoroServer] Synthesized "${text.slice(0, 30)}..." in ${Date.now() - t0}ms (Voice: ${voice}, Speed: ${speed}x, Bytes: ${buffer.length})`
        );

        res.writeHead(200, {
          'Content-Type': 'audio/wav',
          'Content-Length': buffer.length,
          'X-Sampling-Rate': audio.sampling_rate || 24000,
          'X-Duration-Seconds': (audio.audio.length / (audio.sampling_rate || 24000)).toFixed(2),
        });
        res.end(buffer);
      } catch (err) {
        console.error('[KokoroServer] Synthesis error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Synthesis failed' }));
      }
    });
    return;
  }

  // Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

// Robust error handling on the HTTP server to prevent exit code 7
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[KokoroServer] Port ${PORT} is already in use by another instance. Keeping alive.`);
  } else {
    console.error('[KokoroServer] Server error:', err);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[KokoroServer] Kokoro Neural TTS Server running locally at http://127.0.0.1:${PORT}`);
});
