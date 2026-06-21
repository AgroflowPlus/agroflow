import { Router, Response, Request } from 'express';
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

// Test endpoint to check if Hugging Face is reachable
router.get('/test', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Testing Hugging Face connection...');
    
    const axios = require('axios');
    const response = await axios.get('https://api-inference.huggingface.co/status', {
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
      },
      timeout: 10000,
    });
    
    res.json({ 
      success: true, 
      status: response.status,
      data: response.data 
    });
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    res.json({ 
      success: false, 
      error: error.message,
      code: error.code 
    });
  }
});

// Process voice input
router.post('/process', protect, upload.single('audio'), async (req: AuthRequest, res: Response) => {
  const startTime = Date.now();
  
  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎤 VOICE PROCESSING REQUEST STARTED');
    console.log(`🕐 Time: ${new Date().toISOString()}`);
    console.log(`👤 User ID: ${req.user?.id}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (!req.file) {
      console.error('❌ No audio file provided');
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }
    
    console.log(`📦 Audio file received: ${req.file.originalname}`);
    console.log(`📦 Audio size: ${req.file.size} bytes`);
    console.log(`📦 Audio mimetype: ${req.file.mimetype}`);
    
    // Step 1: Speech to Text + Language Detection + Translation
    console.log('🔄 Step 1: Processing audio with Hugging Face...');
    const { originalText, detectedLanguage, englishText } = await processVoiceInput(req.file.buffer);
    
    console.log(`\n📝 Results:`);
    console.log(`  🗣️ Original: "${originalText}"`);
    console.log(`  🌍 Language: ${detectedLanguage}`);
    console.log(`  📝 English: "${englishText}"`);
    
    // Step 2: Get user name
    let userName = 'Farmer';
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { name: true }
      });
      if (user?.name) userName = user.name;
      console.log(`👤 User name: ${userName}`);
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
    
    // Step 3: Process through AI Engine
    console.log('🔄 Step 2: Processing through AI Engine...');
    const aiResult = await processAIRequest({
      message: englishText,
      farmerName: userName,
      location: 'Nigeria',
    });
    
    console.log(`🤖 AI Response: "${aiResult.aiText.substring(0, 100)}..."`);
    console.log(`📊 AI Source: ${aiResult.source}`);
    
    const duration = Date.now() - startTime;
    console.log(`\n⏱️ Total processing time: ${duration}ms`);
    console.log('✅ VOICE PROCESSING COMPLETE ✅\n');
    
    res.json({
      success: true,
      originalText,
      detectedLanguage,
      englishText,
      response: aiResult.aiText,
      aiSource: aiResult.source,
      processingTime: duration,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('\n❌❌❌ VOICE PROCESSING FAILED ❌❌❌');
    console.error(`⏱️ Failed after: ${duration}ms`);
    console.error(`📝 Error: ${error.message}`);
    console.error('═══════════════════════════════════════════════════════\n');
    
    res.status(500).json({ 
      error: 'Failed to process voice input',
      details: error.message,
    });
  }
});

export default router;