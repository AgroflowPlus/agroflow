import Groq from 'groq-sdk';
import axios from 'axios';
import { Readable } from 'stream';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

// ── 3. TRANSLATE TO ENGLISH (MyMemory — free, no key needed) ─────────────────

const MYMEMORY_LANG_MAP = {
  yoruba:  'yo',
  pidgin:  'en',   // MyMemory has no Pidgin — treat as English variant
  english: 'en',
};

export async function translateToEnglish(
  text: string,
  language: 'english' | 'yoruba' | 'pidgin',
): Promise<string> {
  if (language === 'english') return text;

  // For Pidgin: light word-swap is enough (MyMemory doesn't know Pidgin)
  if (language === 'pidgin') return pidginToEnglish(text);

  // For Yoruba: use MyMemory
  try {
    console.log(`🌍 Translating Yoruba → English via MyMemory...`);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=yo|en`;
    const res = await axios.get(url, { timeout: 8000 });
    const translated = res.data?.responseData?.translatedText;
    if (translated && translated !== text) {
      console.log(`✅ Translated: "${translated}"`);
      return translated;
    }
  } catch (err: any) {
    console.warn(`⚠️ MyMemory failed: ${err.message} — using original text`);
  }

  return text; // fallback: send original, AI will still understand context
}

// ── 4. TRANSLATE RESPONSE BACK ────────────────────────────────────────────────

export async function translateFromEnglish(
  text: string,
  targetLanguage: 'english' | 'yoruba' | 'pidgin',
): Promise<string> {
  if (targetLanguage === 'english') return text;

  if (targetLanguage === 'pidgin') return englishToPidgin(text);

  // Yoruba: MyMemory en → yo
  try {
    console.log(`🌍 Translating English → Yoruba via MyMemory...`);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|yo`;
    const res = await axios.get(url, { timeout: 8000 });
    const translated = res.data?.responseData?.translatedText;
    if (translated && translated !== text) {
      console.log(`✅ Translated back: "${translated.substring(0, 80)}..."`);
      return translated;
    }
  } catch (err: any) {
    console.warn(`⚠️ MyMemory reverse failed: ${err.message} — returning English`);
  }

  return text;
}

// ── 5. PIDGIN DICTIONARIES ────────────────────────────────────────────────────

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