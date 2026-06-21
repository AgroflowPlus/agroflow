import { Router, Response } from 'express';
import multer from 'multer';
import { protect, AuthRequest } from '../middleware/auth';
import prisma from '../db/index';
import { processVoiceInput } from '../services/voiceService';
import { processAIRequest } from '../services/aiEngine';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Process voice input
router.post('/process', protect, upload.single('audio'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }
    
    console.log('🎤 Processing voice input...');
    
    // Step 1: Speech to Text + Language Detection + Translation
    const { originalText, detectedLanguage, englishText } = await processVoiceInput(req.file.buffer);
    
    console.log(`🗣️ Original: ${originalText}`);
    console.log(`🌍 Language: ${detectedLanguage}`);
    console.log(`📝 English: ${englishText}`);
    
    // Step 2: Get user name
    let userName = 'Farmer';
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { name: true }
      });
      if (user?.name) userName = user.name;
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
    
    // Step 3: Process through AI Engine
    const aiResult = await processAIRequest({
      message: englishText,
      farmerName: userName,
      location: 'Nigeria',
    });
    
    // Step 4: Translate response back (optional - keep in English for now)
    // You can add translation back to the original language here if needed
    
    res.json({
      success: true,
      originalText,
      detectedLanguage,
      englishText,
      response: aiResult.aiText,
      aiSource: aiResult.source,
    });
  } catch (error: any) {
    console.error('❌ Voice processing error:', error.message);
    res.status(500).json({ 
      error: 'Failed to process voice input',
      details: error.message 
    });
  }
});

export default router;