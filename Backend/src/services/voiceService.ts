import Groq from 'groq-sdk';
import axios from 'axios';
import { Readable } from 'stream';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── GROQ TRANSLATION HELPER ───────────────────────────────────────────────────

async function groqTranslate(
  text: string,
  fromLang: string,
  toLang: string,
): Promise<string> {
  try {
    const prompt = toLang === 'english'
      ? `Translate this ${fromLang} text to English. Return ONLY the translation, nothing else:\n"${text}"`
      : `Translate this English text to ${fromLang}. Keep it natural and conversational for a Nigerian farmer. Return ONLY the translation, nothing else:\n"${text}"`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,    // low temp = more accurate translation
      max_tokens: 512,
    });

    const result = completion.choices[0]?.message?.content?.trim();
    if (!result) throw new Error('Empty translation');
    console.log(`✅ Groq translated: "${result.substring(0, 80)}"`);
    return result;
  } catch (err: any) {
    console.warn(`⚠️ Groq translation failed: ${err.message}`);
    return text; // fallback: return original
  }
}

// ── 1. SPEECH TO TEXT (Groq Whisper) ─────────────────────────────────────────

export async function speechToText(audioBuffer: Buffer): Promise<string> {
  console.log('🎤 Sending audio to Groq Whisper...');

  const arrayBuffer = audioBuffer.buffer.slice(
    audioBuffer.byteOffset,
    audioBuffer.byteOffset + audioBuffer.byteLength
  ) as ArrayBuffer;
  
  // Groq SDK needs a File-like object — wrap as a Blob using ArrayBuffer
  const audioFile = new File([arrayBuffer], 'recording.webm', {
    type: 'audio/webm',
  });

  const transcription = await groq.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-large-v3',   // best accuracy, still free on Groq
    response_format: 'text',
    // No language lock — lets Whisper auto-detect English/Yoruba/Pidgin
  });

  const text = (transcription as unknown as string).trim();
  console.log(`✅ Whisper transcript: "${text}"`);

  if (!text) throw new Error('No speech detected. Please speak clearly and try again.');
  return text;
}

// ── 2. LANGUAGE DETECTION ─────────────────────────────────────────────────────
// Simple word-list detection — good enough for EN / YO / Pidgin

export function detectLanguage(text: string): 'english' | 'yoruba' | 'pidgin' {
  const t = text.toLowerCase();

  const yorubaWords = [
    'mo', 'fẹ', 'fe', 'gbin', 'agbado', 'bawo', 'ṣe', 'se',
    'ile', 'omi', 'kore', 'nibo', 'kini', 'igba', 'pupo',
    'dara', 'buburu', 'ode', 'oko', 'ewe', 'irugbin',
  ];
  const pidginWords = [
    'wan', 'sabi', 'dey', 'dem', 'fit', 'chop', 'komot',
    'abeg', 'wahala', 'na', 'wey', 'sef', 'oga', 'padi',
    'e don', 'wetin', 'how far', 'no be',
  ];

  const yorubaScore  = yorubaWords.filter(w => t.includes(w)).length;
  const pidginScore  = pidginWords.filter(w => t.includes(w)).length;

  if (yorubaScore  >= 2) return 'yoruba';
  if (pidginScore  >= 2) return 'pidgin';
  if (yorubaScore  === 1 && pidginScore === 0) return 'yoruba';
  if (pidginScore  === 1 && yorubaScore === 0) return 'pidgin';
  return 'english';
}

// ── 3. TRANSLATE TO ENGLISH (Groq) ─────────────────────────────────────────

export async function translateToEnglish(
  text: string,
  language: 'english' | 'yoruba' | 'pidgin',
): Promise<string> {
  if (language === 'english') return text;

  // For Pidgin: use Groq for better translation
  if (language === 'pidgin') {
    console.log(`🌍 Translating Pidgin → English via Groq...`);
    return groqTranslate(text, 'Nigerian Pidgin', 'english');
  }

  // For Yoruba: use Groq
  console.log(`🌍 Translating Yoruba → English via Groq...`);
  return groqTranslate(text, 'Yoruba', 'english');
}

// ── 4. TRANSLATE RESPONSE BACK (Groq) ──────────────────────────────────────

export async function translateFromEnglish(
  text: string,
  targetLanguage: 'english' | 'yoruba' | 'pidgin',
): Promise<string> {
  if (targetLanguage === 'english') return text;

  if (targetLanguage === 'pidgin') {
    console.log(`🌍 Translating English → Pidgin via Groq...`);
    return groqTranslate(text, 'English', 'Nigerian Pidgin');
  }

  // Yoruba
  console.log(`🌍 Translating English → Yoruba via Groq...`);
  return groqTranslate(text, 'English', 'Yoruba');
}

// ── 5. PIDGIN DICTIONARIES (Fallback) ──────────────────────────────────────

function pidginToEnglish(text: string): string {
  const map: Record<string, string> = {
    'i wan':      'I want to',
    'wan':        'want to',
    'sabi':       'know',
    'dey':        'is',
    'dem':        'they',
    'fit':        'can',
    'chop':       'eat',
    'komot':      'remove',
    'abeg':       'please',
    'no wahala':  'no problem',
    'wahala':     'problem',
    'na':         'it is',
    'wey':        'which',
    'sef':        'also',
    'oga':        'boss',
    'padi':       'friend',
    'wetin':      'what',
    'how far':    'how are you',
    'e don':      'it has',
    'no be':      'is it not',
    'gbe':        'carry',
    'plant am':   'plant it',
    'water am':   'water it',
    'harvest am': 'harvest it',
  };

  let result = text.toLowerCase();
  Object.entries(map).forEach(([pidgin, english]) => {
    result = result.replace(new RegExp(`\\b${pidgin}\\b`, 'gi'), english);
  });
  return result;
}

function englishToPidgin(text: string): string {
  const map: Record<string, string> = {
    'please':       'abeg',
    'I want to':    'I wan',
    'want to':      'wan',
    'know':         'sabi',
    'is ':          'dey ',
    'they ':        'dem ',
    'can ':         'fit ',
    'no problem':   'no wahala',
    'problem':      'wahala',
    'what':         'wetin',
    'also':         'sef',
    'it has':       'e don',
    'how are you':  'how far',
  };

  let result = text;
  Object.entries(map).forEach(([english, pidgin]) => {
    result = result.replace(new RegExp(`\\b${english}\\b`, 'gi'), pidgin);
  });
  return result;
}

// ── 6. MAIN PIPELINE ──────────────────────────────────────────────────────────

export async function processVoiceInput(audioBuffer: Buffer): Promise<{
  originalText:     string;
  detectedLanguage: string;
  englishText:      string;
}> {
  console.log('🔵 processVoiceInput started');
  console.log(`📦 Audio size: ${audioBuffer.length} bytes`);

  const originalText     = await speechToText(audioBuffer);
  const detectedLanguage = detectLanguage(originalText);
  const englishText      = await translateToEnglish(originalText, detectedLanguage);

  console.log(`🗣️  Original:  "${originalText}"`);
  console.log(`🌍 Language:  ${detectedLanguage}`);
  console.log(`📝 English:   "${englishText}"`);

  return { originalText, detectedLanguage, englishText };
}