import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import axios from 'axios';

// ── VOICES ────────────────────────────────────────────────────
const VOICES = {
  english: 'en-NG-EzinneNeural',  // Nigerian English female
  pidgin:  'en-NG-EzinneNeural',  // Pidgin — Nigerian English voice
};

// ── ENGLISH + PIDGIN — msedge-tts ────────────────────────────
async function edgeTTS(text: string, voice: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const { audioStream } = tts.toStream(text);

    audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    audioStream.on('end',  () => resolve(Buffer.concat(chunks)));
    audioStream.on('error', reject);
  });
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
    console.error(`❌ TTS failed: ${err.message} — falling back to English`);
    const audio = await edgeTTS(text, 'en-NG-EzinneNeural');
    return { audio, mimeType: 'audio/mpeg' };
  }
}