import { EdgeTTS } from 'edge-tts-universal';
import axios from 'axios';

// ── VOICES ────────────────────────────────────────────────────
const VOICES = {
  english: 'en-NG-EzinneNeural',  // Nigerian English female
  pidgin:  'en-NG-EzinneNeural',  // Pidgin — Nigerian English voice
};

// ── ENGLISH + PIDGIN — edge-tts-universal ────────────────────
async function edgeTTS(text: string, voice: string): Promise<Buffer> {
  try {
    // The new library uses a simple, modern API
    const tts = new EdgeTTS(text, voice);
    const result = await tts.synthesize();
    
    // Convert the Uint8Array result to a Node.js Buffer
    return Buffer.from(result.audio);
  } catch (err: any) {
    console.error('❌ TTS FAILED (synchronous):', err?.message, err);
    throw err;
  }
}

// ── YORUBA — HuggingFace Facebook MMS TTS ────────────────────
async function yorubaTTS(text: string): Promise<Buffer> {
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
    }
  );
  return Buffer.from(response.data);
}

// ── MAIN EXPORT ───────────────────────────────────────────────
export async function textToSpeech(
  text: string,
  language: 'english' | 'yoruba' | 'pidgin' = 'english',
): Promise<{ audio: Buffer; mimeType: string }> {
  console.log(`🔊 TTS: language=${language}, text="${text.substring(0, 60)}"`);

  try {
    if (language === 'yoruba') {
      console.log('🇳🇬 Using HuggingFace MMS Yoruba TTS...');
      const audio = await yorubaTTS(text);
      return { audio, mimeType: 'audio/wav' };
    }

    const voice = VOICES[language as keyof typeof VOICES] ?? VOICES.english;
    console.log(`🇳🇬 Using Edge TTS voice: ${voice}`);
    const audio = await edgeTTS(text, voice);
    return { audio, mimeType: 'audio/mpeg' };

  } catch (err: any) {
    console.error(`🚨 TTS completely failed: ${err.message} — falling back to English`);
    const audio = await edgeTTS(text, 'en-NG-EzinneNeural');
    return { audio, mimeType: 'audio/mpeg' };
  }
}
