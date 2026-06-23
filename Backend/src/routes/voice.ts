import { Request, Response, Router } from 'express';
import multer from 'multer';
import { processVoiceInput } from '../services/voiceService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ── VOICE PROCESSING ENDPOINT ────────────

router.post('/process', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    console.log('🔵 /voice/process hit');

    // 1. Check authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // 2. Validate audio file
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided' });
    }

    console.log(`📦 Received audio: ${req.file.size} bytes, mimetype: ${req.file.mimetype}`);

    // 3. Process the audio buffer
    const audioBuffer = req.file.buffer;
    const result = await processVoiceInput(audioBuffer);

    // 4. Return the transcribed text
    res.json({
      success: true,
      originalText: result.originalText,
      detectedLanguage: result.detectedLanguage,
      response: result.englishText, // This will be sent to the AI
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