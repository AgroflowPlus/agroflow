// import { Router, Response } from 'express';
// import multer from 'multer';
// import { protect, AuthRequest } from '../middleware/auth';
// import prisma from '../db/index';
// import { processVoiceInput, translateFromEnglish } from '../services/voiceService';
// import { processAIRequest } from '../services/aiEngine';

// const router = Router();
// const upload = multer({ 
//   storage: multer.memoryStorage(), 
//   limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
// });

// // Process voice input
// router.post('/process', protect, upload.single('audio'), async (req: AuthRequest, res: Response) => {
//   try {
//     if (!req.file) {
//       res.status(400).json({ error: 'No audio file provided' });
//       return;
//     }
    
//     // Step 1: Speech to Text + Language Detection + Translation
//     const { originalText, detectedLanguage, englishText } = await processVoiceInput(req.file.buffer);
    
//     // Step 2: Get user name
//     let userName = 'Farmer';
//     try {
//       const user = await prisma.user.findUnique({
//         where: { id: req.user!.id },
//         select: { name: true }
//       });
//       if (user?.name) userName = user.name;
//     } catch (error) {
//       console.error('Error fetching user name:', error);
//     }
    
//     // Step 3: Process through AI Engine
//     const aiResult = await processAIRequest({
//       message: englishText,
//       farmerName: userName,
//       location: 'Nigeria',
//     });
    
//     // Step 4: Translate response back to original language
//     const finalResponse = translateFromEnglish(aiResult.aiText, detectedLanguage);
    
//     res.json({
//       success: true,
//       originalText,
//       detectedLanguage,
//       englishText,
//       response: finalResponse,
//       aiSource: aiResult.source,
//     });
//   } catch (error) {
//     console.error('Voice processing error:', error);
//     res.status(500).json({ error: 'Failed to process voice input' });
//   }
// });

// export default router;