import { Request, Response, Router } from 'express';
import multer from 'multer';
import { protect, AuthRequest } from '../middleware/auth';
import prisma from '../db/index';
import { processVoiceInput, translateFromEnglish } from '../services/voiceService';
import { textToSpeech } from '../services/ttsService';
import { processAIRequest, AIInput, CropType } from '../services/aiEngine';

const router  = Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── FARMING KEYWORDS (same as aiController) ───────────────────
const FARMING_KEYWORDS = [
  'plant', 'grow', 'crop', 'farm', 'soil', 'water', 'harvest',
  'maize', 'corn', 'cassava', 'tomato', 'pepper', 'fertilizer',
  'pest', 'disease', 'irrigation', 'seed', 'yield', 'field',
  'rain', 'dry', 'wet', 'sun', 'season', 'spray', 'weed',
];

// ── POST /voice/process ───────────────────────────────────────
router.post('/process', protect, upload.single('audio'), async (req: AuthRequest, res: Response) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided' });
    }

    // Step 1: STT + language detection + translate to English
    const { originalText, detectedLanguage, englishText } =
      await processVoiceInput(req.file.buffer);

    const lang = detectedLanguage as 'english' | 'yoruba' | 'pidgin';
    const lowerText = englishText.toLowerCase();

    // Step 2: Get farmer data (same as aiController)
    let farmerName = 'Farmer';
    const aiInput: AIInput = {
      message:    englishText,
      farmerName: 'Farmer',
      location:   'Nigeria',
    };

    if (req.user?.id) {
      const farmer = await prisma.farmer.findUnique({
        where:   { userId: req.user.id },
        include: { fields: true, user: true },
      });

      if (farmer) {
        farmerName          = farmer.user.name;
        aiInput.farmerName  = farmer.user.name;
        aiInput.location    = farmer.location;

        const crops: CropType[] = ['Maize', 'Cassava', 'Tomato', 'Pepper'];
        const matchedCrop = crops.find(c =>
          lowerText.includes(c.toLowerCase()) ||
          (c === 'Maize' && lowerText.includes('corn'))
        );

        if (matchedCrop) {
          const matchedField = farmer.fields.find(f => f.crop === matchedCrop);
          if (matchedField) {
            aiInput.crop          = matchedField.crop as CropType;
            aiInput.soilMoisture  = matchedField.soilMoisture ?? undefined;
            aiInput.ndvi          = matchedField.ndvi ?? undefined;
            aiInput.lastIrrigation = matchedField.lastIrrigation?.toISOString() ?? null;
            aiInput.plantingDate  = matchedField.createdAt.toISOString();
            aiInput.location      = matchedField.location;
          }
        }
      }
    }

    // Step 3: Check greeting (same logic as aiController)
    const hasFarmingIntent = FARMING_KEYWORDS.some(k => lowerText.includes(k));
    const greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"];
    const isPureGreeting = !hasFarmingIntent &&
      lowerText.length < 40 &&
      greetings.some(g => lowerText === g || lowerText.startsWith(g));

    let englishResponse: string;

    if (isPureGreeting) {
      englishResponse = `Hello ${farmerName}! I am AgroFlow, your farming helper. Ask me anything about your crops. Which crop you want to talk about? Maize, Cassava, Tomato or Pepper?`;
    } else if (!hasFarmingIntent && lowerText.length < 30 && lowerText.includes('thank')) {
      englishResponse = `You are welcome ${farmerName}! Come back anytime you need help with your farm. Good luck with your crops!`;
    } else if (!hasFarmingIntent && lowerText.length < 20 && (lowerText.includes('bye') || lowerText.includes('goodbye'))) {
      englishResponse = `Goodbye ${farmerName}! Wishing you a good harvest. Come back anytime!`;
    } else {
      // Step 4: Process through AI engine
      const aiResult = await processAIRequest(aiInput);
      englishResponse = aiResult.aiText;
    }

    // Step 5: Translate response back to farmer's language
    const translatedResponse = await translateFromEnglish(englishResponse, lang);

    console.log(`⏱️ Done in ${Date.now() - startTime}ms`);

    res.json({
      success:          true,
      originalText,
      detectedLanguage,
      englishText,
      response:         translatedResponse,
      responseEnglish:  englishResponse,
    });

  } catch (error: any) {
    console.error('❌ Voice processing error:', error.message);

    // User-friendly error for silence/short audio
    const isSilenceError = error.message?.includes('No speech') ||
                           error.message?.includes('too short');

    res.status(isSilenceError ? 400 : 500).json({
      success: false,
      error:   isSilenceError
        ? 'No speech detected. Please hold the button and speak clearly.'
        : error.message || 'Failed to process voice',
    });
  }
});

// ── POST /voice/speak ─────────────────────────────────────────
router.post('/speak', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { text, language = 'english' } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const { audio, mimeType } = await textToSpeech(
      text.trim(),
      language as 'english' | 'yoruba' | 'pidgin',
    );

    res.json({
      success:  true,
      audio:    audio.toString('base64'),
      mimeType,
      language,
    });

  } catch (err: any) {
    console.error('TTS error:', err.message);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

export default router;