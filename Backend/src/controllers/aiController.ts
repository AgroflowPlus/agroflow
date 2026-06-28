import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import prisma from '../db/index'
import { processAIRequest, AIInput, CropType } from '../services/aiEngine'

// ── FARMING KEYWORDS ──────────────────────────────────────────────────────────
// If any of these exist in the message, skip greeting check
const farmingKeywords = [
  'plant', 'grow', 'crop', 'farm', 'soil', 'water', 'harvest',
  'maize', 'corn', 'cassava', 'tomato', 'pepper', 'fertilizer',
  'pest', 'disease', 'irrigation', 'seed', 'yield', 'field',
  'rain', 'dry', 'wet', 'sun', 'season', 'spray', 'weed',
];

export async function chat(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { message, fieldId } = req.body;
    
    console.log("=========================================");
    console.log("CHAT FUNCTION CALLED");
    console.log("Message:", message);
    console.log("=========================================");
    
    if (!message || message.trim().length === 0) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }
    
    const cleanMessage = message.trim();
    const lowerMessage = cleanMessage.toLowerCase();
    
    // ── Check for farming intent ────────────────────────────────────────────
    const hasFarmingIntent = farmingKeywords.some(k => lowerMessage.includes(k));

    // ── Greeting check ──────────────────────────────────────────────────────
    // Only treat as greeting if message is SHORT and has NO farming intent
    const greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"];
    const isPureGreeting = !hasFarmingIntent &&
      lowerMessage.length < 40 &&
      greetings.some(g => lowerMessage === g || lowerMessage.startsWith(g));

    if (isPureGreeting) {
      res.status(200).json({
        aiText: `Hello! I am AgroFlow, your farming helper.\n\nAsk me anything about your crops. I can help with:\n• When to plant and harvest\n• How to water your crops\n• How to fix soil problems\n• Pest and disease help\n\nWhich crop you want to talk about? Maize, Cassava, Tomato or Pepper?`,
        ruleResult: null,
        source: 'greeting',
      });
      return;
    }

    // ── Thank you check ─────────────────────────────────────────────────────
    // Only treat as thank you if SHORT and no farming intent
    if (!hasFarmingIntent && lowerMessage.length < 30 && lowerMessage.includes('thank')) {
      res.status(200).json({
        aiText: `You are welcome! Come back anytime you need help with your farm. Good luck with your crops!`,
        ruleResult: null,
        source: 'greeting',
      });
      return;
    }

    // ── Goodbye check ──────────────────────────────────────────────────────
    // Only treat as goodbye if SHORT and no farming intent
    if (!hasFarmingIntent && lowerMessage.length < 20 &&
      (lowerMessage.includes('bye') || lowerMessage.includes('goodbye'))) {
      res.status(200).json({
        aiText: `Goodbye! Wishing you a good harvest. Come back anytime!`,
        ruleResult: null,
        source: 'greeting',
      });
      return;
    }
    
    console.log("🌾 Processing farming question...");
    
    // Build input for rule engine
    const aiInput: AIInput = {
      message: cleanMessage,
      farmerName: 'Farmer',
      location: 'Nigeria',
    };
    
    // Get farmer's field data if available
    if (req.user?.id) {
      const farmer = await prisma.farmer.findUnique({
        where: { userId: req.user.id },
        include: { fields: true, user: true },
      });
      
      if (farmer) {
        aiInput.farmerName = farmer.user.name;
        aiInput.location = farmer.location;
        
        // Detect crop from message
        const crops: CropType[] = ['Maize', 'Cassava', 'Tomato', 'Pepper'];
        const messageLower = cleanMessage.toLowerCase();
        const matchedCrop = crops.find(c => 
          messageLower.includes(c.toLowerCase()) || 
          (c === 'Maize' && messageLower.includes('corn'))
        );
        
        if (matchedCrop) {
          const matchedField = farmer.fields.find(f => f.crop === matchedCrop);
          if (matchedField) {
            aiInput.crop = matchedField.crop as CropType;
            aiInput.soilMoisture = matchedField.soilMoisture;
            aiInput.ndvi = matchedField.ndvi;
            aiInput.lastIrrigation = matchedField.lastIrrigation?.toISOString() ?? null;
            aiInput.plantingDate = matchedField.createdAt.toISOString();
            aiInput.location = matchedField.location;
          }
        }
      }
    }
    
    // Process through rule engine + optional AI explanation
    const result = await processAIRequest(aiInput);
    
    res.status(200).json({
      aiText: result.aiText,
      ruleResult: result.ruleResult,
      source: result.source,
    });
    return;
    
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      aiText: "I'm having trouble right now. Please try again.",
      ruleResult: null,
      source: 'error'
    });
    return;
  }
}

export async function cropCheck(req: AuthRequest, res: Response): Promise<void> {
  res.json({ valid: true, message: "Crop check endpoint" });
}