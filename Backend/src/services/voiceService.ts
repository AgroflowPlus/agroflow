import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── WHISPER HALLUCINATION PHRASES ─────────────────────────────
const HALLUCINATED_PHRASES = [
  "you", "thank you", "thanks", "thank you.", "thanks.",
  "thank you for watching", "thanks for watching",
  "bye", "goodbye", "see you", "see you next time",
  "please subscribe", "like and subscribe",
  ".", "..", "...", " ", "you.", "you!", "you?",
];

function isHallucination(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length < 3) return true;
  if (HALLUCINATED_PHRASES.includes(t)) return true;
  const words = t.split(" ").filter(Boolean);
  if (words.length === 1 && !["hi", "hello", "hey"].includes(words[0])) return true;
  return false;
}

// ── GROQ TRANSLATION HELPER ───────────────────────────────────
async function groqTranslate(
  text: string,
  fromLang: string,
  toLang: string,
): Promise<string> {
  try {
    let userPrompt = "";
 
    if (toLang === "english") {
      userPrompt = `Translate the following ${fromLang} text into English. The text may be long and contain multiple paragraphs or numbered points — translate all of it completely, keeping the same structure and numbering. Output ONLY the translated text with no preamble, no comments, no meta remarks.\n\n---\n${text}\n---`;
    } else if (toLang === "pidgin") {
      userPrompt = `Translate the following English text into Nigerian Pidgin English. The text may be long and contain multiple paragraphs or numbered points — translate all of it completely, keeping the same structure and numbering. Use natural Pidgin words like: wan, sabi, dey, abeg, wahala, wetin, e don. Output ONLY the translated text with no preamble, no comments, no meta remarks.\n\n---\n${text}\n---`;
    } else if (toLang === "yoruba") {
      userPrompt = `Translate the following English text into Yoruba. The text may be long and contain multiple paragraphs or numbered points — translate all of it completely, keeping the same structure and numbering. Output ONLY the translated text with no preamble, no comments, no meta remarks.\n\n---\n${text}\n---`;
    }
 
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a professional translator. You translate the full text given to you, no matter how long, completely and accurately. You never summarize, never shorten, never add commentary, and never say things like 'no text to translate' — there is always text to translate in the message you receive. Output only the translation.",
        },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 2048, // was 400 — too small for multi-paragraph AI responses
    });
 
    let result = completion.choices[0]?.message?.content?.trim();
 
    if (!result) throw new Error("Empty translation");
 
    // Guard: if Groq returns a meta-comment instead of an actual translation,
    // fall back to the original text rather than showing the farmer a broken reply
    const metaPhrases = [
      "no text to translate",
      "there is no text",
      "please provide",
      "i don't see any text",
      "i need the text",
    ];
    const looksLikeMeta = metaPhrases.some(p => result!.toLowerCase().includes(p));
 
    if (looksLikeMeta) {
      console.warn(`⚠️ Groq returned a meta-comment instead of translating — using original text`);
      return text;
    }
 
    console.log(`✅ Translated (${fromLang}→${toLang}): "${result.substring(0, 80)}..."`);
    return result;
 
  } catch (err: any) {
    console.warn(`⚠️ Translation failed: ${err.message} — returning original`);
    return text;
  }
}

// ── WHISPER TRANSCRIPTION (with optional language hint) ───────
async function whisperTranscribe(
  audioFile: File,
  language?: string,
): Promise<string> {
  const options: any = {
    file: audioFile,
    model: "whisper-large-v3",
    response_format: "text",
  };

  // Pass language hint to Whisper for better accuracy
  if (language) options.language = language;

  const transcription = await groq.audio.transcriptions.create(options);
  return (transcription as unknown as string).trim();
}

// ── SPEECH TO TEXT ────────────────────────────────────────────
// Two-pass: first detect language from a quick English transcription,
// then re-transcribe with the correct language hint for Yoruba
export async function speechToText(audioBuffer: Buffer): Promise<{
  text: string;
  detectedLanguage: "english" | "yoruba" | "pidgin";
}> {
  console.log("🎤 Sending audio to Groq Whisper...");
  console.log(`📦 Audio size: ${audioBuffer.length} bytes`);

  if (audioBuffer.length < 5000) {
    throw new Error("Audio too short. Please hold the button and speak clearly.");
  }

  const arrayBuffer = audioBuffer.buffer.slice(
    audioBuffer.byteOffset,
    audioBuffer.byteOffset + audioBuffer.byteLength,
  ) as ArrayBuffer;

  const audioFile = new File([arrayBuffer], "recording.webm", { type: "audio/webm" });

  // Pass 1 — transcribe without language hint (auto-detect)
  const pass1Text = await whisperTranscribe(audioFile);
  console.log(`✅ Pass 1 transcript: "${pass1Text}"`);

  if (!pass1Text || isHallucination(pass1Text)) {
    throw new Error("No speech detected. Please speak clearly and try again.");
  }

  // Detect language from pass 1
  const detectedLanguage = await detectLanguageWithGroq(pass1Text);
  console.log(`🌍 Detected language: ${detectedLanguage}`);

  // Pass 2 — if Yoruba detected, re-transcribe with 'yo' hint for accuracy
  if (detectedLanguage === "yoruba") {
    try {
      console.log("🔄 Re-transcribing with Yoruba language hint...");
      const pass2Text = await whisperTranscribe(audioFile, "yo");
      if (pass2Text && !isHallucination(pass2Text) && pass2Text.length > pass1Text.length * 0.5) {
        console.log(`✅ Pass 2 (Yoruba) transcript: "${pass2Text}"`);
        return { text: pass2Text, detectedLanguage };
      }
    } catch {
      // If pass 2 fails, use pass 1
    }
  }

  return { text: pass1Text, detectedLanguage };
}

// ── LANGUAGE DETECTION ────────────────────────────────────────
export async function detectLanguageWithGroq(
  text: string,
): Promise<"english" | "yoruba" | "pidgin"> {
  const t = text.toLowerCase();

  // Unique Pidgin phrases
  const pidginWords = ["sabi", "wahala", "abeg", "wetin", "how far", "e don", "i wan", "dem dey"];
  if (pidginWords.some(w => t.includes(w))) return "pidgin";

  // Yoruba WITH diacritics
  const yorubaWithDiacritics = ["fẹ", "ṣe", "ọ", "ẹ", "ì", "à", "è", "agbado", "irugbin"];
  if (yorubaWithDiacritics.some(w => t.includes(w))) return "yoruba";

  // Yoruba WITHOUT diacritics (phonetic)
  const yorubaPhonetic = ["mo fe", "mo wa", "bawo ni", "se o", "gbin", "ewe "];
  if (yorubaPhonetic.some(w => t.includes(w))) return "yoruba";

  // Ask Groq if text looks non-English
  const hasNonEnglishPattern =
    /[^\x00-\x7F]/.test(text) ||
    (text.split(" ").length < 8 &&
      !/\b(the|is|are|can|how|what|when|where|why|plant|grow|farm|water|soil|crop|maize|cassava|tomato|pepper|i|my|me|you|your)\b/i.test(text));

  if (hasNonEnglishPattern) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [{
          role: "user",
          content: `What language is this text? Reply with ONLY one word: english, yoruba, or pidgin.\nText: "${text}"`,
        }],
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        max_tokens: 10,
      });
      const lang = completion.choices[0]?.message?.content?.trim().toLowerCase();
      if (lang === "yoruba") return "yoruba";
      if (lang === "pidgin") return "pidgin";
    } catch {
      // fallback
    }
  }

  return "english";
}

// ── TRANSLATE TO ENGLISH ──────────────────────────────────────
export async function translateToEnglish(
  text: string,
  language: "english" | "yoruba" | "pidgin",
): Promise<string> {
  if (language === "english") return text;
  if (language === "pidgin") return groqTranslate(text, "Nigerian Pidgin", "english");
  return groqTranslate(text, "Yoruba", "english");
}

// ── TRANSLATE FROM ENGLISH ────────────────────────────────────
export async function translateFromEnglish(
  text: string,
  targetLanguage: "english" | "yoruba" | "pidgin",
): Promise<string> {
  if (targetLanguage === "english") return text;
  if (targetLanguage === "pidgin") return groqTranslate(text, "English", "Nigerian Pidgin");
  return groqTranslate(text, "English", "Yoruba");
}

// ── MAIN PIPELINE ─────────────────────────────────────────────
export async function processVoiceInput(audioBuffer: Buffer): Promise<{
  originalText: string;
  detectedLanguage: string;
  englishText: string;
}> {
  console.log("🔵 processVoiceInput started");

  // Single call — STT + language detection combined
  const { text: originalText, detectedLanguage } = await speechToText(audioBuffer);
  const englishText = await translateToEnglish(originalText, detectedLanguage);

  console.log(`🗣️  Original:  "${originalText}"`);
  console.log(`🌍 Language:  ${detectedLanguage}`);
  console.log(`📝 English:   "${englishText}"`);

  return { originalText, detectedLanguage, englishText };
}