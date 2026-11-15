import { EdgeTTS } from 'edge-tts-universal';
import axios from 'axios';
import util from 'util';

// ── VOICES ────────────────────────────────────────────────────
const VOICES = {
  english: 'en-NG-EzinneNeural', // Nigerian English female
  pidgin:  'en-NG-EzinneNeural', // Pidgin uses the Nigerian English voice
};

export class TTSUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TTSUnavailableError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

// ── ENGLISH + PIDGIN — edge-tts-universal ────────────────────
async function edgeTTS(text: string, voice: string): Promise<Buffer> {
  try {
    const tts = new EdgeTTS(text, voice);
    const result = await withTimeout(tts.synthesize(), 15000, 'Edge TTS');
    const arrayBuffer = await result.audio.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    // util.inspect shows the real error instead of "[object Object]"
    console.error('❌ Edge TTS failed:', util.inspect(err, { depth: 4 }));
    throw new TTSUnavailableError('Edge TTS unavailable');
  }
}

// ── YORUBA — HuggingFace Facebook MMS TTS ────────────────────
async function yorubaTTS(text: string): Promise<Buffer> {
  try {
    const response = await axios.post(
      'https://router.huggingface.co/hf-inference/models/facebook/mms-tts-yor',
      { inputs: text },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 30000,
      },
    );
    return Buffer.from(response.data);
  } catch (err: any) {
    console.error('❌ Yoruba TTS failed:', err?.response?.status, err?.message);
    throw new TTSUnavailableError('Yoruba TTS unavailable');
  }
}

// ── MAIN EXPORT ───────────────────────────────────────────────
export async function textToSpeech(
  text: string,
  language: 'english' | 'yoruba' | 'pidgin' = 'english',
): Promise<{ audio: Buffer; mimeType: string }> {
  console.log(`🔊 TTS: language=${language}, text="${text.substring(0, 60)}"`);

  if (language === 'yoruba') {
    const audio = await yorubaTTS(text);
    return { audio, mimeType: 'audio/wav' };
  }

  const voice = VOICES[language as keyof typeof VOICES] ?? VOICES.english;
  const audio = await edgeTTS(text, voice);
  return { audio, mimeType: 'audio/mpeg' };
}
