import { Request, Response, Router } from 'express';
import multer from 'multer';
import { processVoiceInput, translateFromEnglish } from '../services/voiceService';
import { processAIRequest } from '../services/aiEngine';
import prisma from '../db/index';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/process', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    console.log('🔵 /voice/process hit');

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided' });
    }

    console.log(`📦 Audio: ${req.file.size} bytes`);

    // Step 1: Speech → text + language detection + translate to English
    const { originalText, detectedLanguage, englishText } =
      await processVoiceInput(req.file.buffer);

    console.log(`🗣️  Heard:    "${originalText}"`);
    console.log(`🌍 Language: ${detectedLanguage}`);
    console.log(`📝 English:  "${englishText}"`);

    // Step 2: Get farmer name for AI context
    let farmerName = 'Farmer';
    try {
      // Decode JWT to get user id
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );
      const user = await prisma.user.findUnique({
        where: { id: payload.id ?? payload.userId ?? payload.sub },
        select: { name: true },
      });
      if (user?.name) farmerName = user.name;
    } catch {
      // non-fatal — use default name
    }

    // Step 3: Send English text to AI engine
    const aiResult = await processAIRequest({
      message:    englishText,
      farmerName,
      location:   'Nigeria',
    });

    console.log(`🤖 AI reply: "${aiResult.aiText.substring(0, 100)}..."`);

    // Step 4: Translate AI reply back to farmer's language
    const translatedResponse = await translateFromEnglish(
      aiResult.aiText,
      detectedLanguage as 'english' | 'yoruba' | 'pidgin',
    );

    // Step 5: Return everything
    res.json({
      success:          true,
      originalText,                    // what farmer said
      detectedLanguage,                // english | yoruba | pidgin
      englishText,                     // farmer's words in English
      response:         translatedResponse,   // ← AI ANSWER in farmer's language
      responseEnglish:  aiResult.aiText,      // AI answer in English (debug)
    });

  } catch (error: any) {
    console.error('❌ Voice processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process voice recording',
    });
  }
});

export default router;