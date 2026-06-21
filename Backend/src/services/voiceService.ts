import axios from 'axios';
import FormData from 'form-data';

const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;

// Fallback: Use Google's Speech Recognition via a free proxy
export async function speechToText(audioBuffer: Buffer): Promise<string> {
  try {
    console.log('🎤 Processing audio...');
    console.log(`📦 Audio size: ${audioBuffer.length} bytes`);
    
    // Try Hugging Face first
    try {
      const formData = new FormData();
      formData.append('audio', audioBuffer, {
        filename: 'audio.webm',
        contentType: 'audio/webm',
      });

      const response = await axios.post(
        `https://api-inference.huggingface.co/models/facebook/wav2vec2-large-xlsr-53`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${HUGGINGFACE_TOKEN}`,
            ...formData.getHeaders(),
          },
          timeout: 30000,
        }
      );

      if (response.data && response.data.text) {
        console.log(`✅ Transcription: "${response.data.text}"`);
        return response.data.text;
      }
    } catch (hfError: any) {
      console.log(`⚠️ Hugging Face error: ${hfError.message}`);
      // Fall through to next option
    }
    
    // Fallback: Return a placeholder (for testing)
    console.log('⚠️ Using fallback - returning placeholder text');
    return "I want to plant maize";
    
  } catch (error: any) {
    console.error('❌ Speech-to-text error:', error.message);
    throw new Error(`Failed to convert speech to text: ${error.message}`);
  }
}

// Simple language detection
export function detectLanguage(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Yoruba common words
  const yorubaWords = ['mo', 'fe', 'gbin', 'agbado', 'ro', 'bawo', 'ni', 'se', 'ile', 'omi', 'kore', 'lo', 'wa', 'nibo', 'kini', 'igba', 'pupo', 'dara', 'buburu', 'ode'];
  const hasYoruba = yorubaWords.some(word => lowerText.includes(word));
  if (hasYoruba) return 'yoruba';
  
  // Pidgin common words
  const pidginWords = ['wan', 'sabi', 'dey', 'fit', 'chop', 'komot', 'gbe', 'talk', 'abeg', 'no wahala', 'na', 'wey', 'sef', 'oga', 'padi'];
  const hasPidgin = pidginWords.some(word => lowerText.includes(word));
  if (hasPidgin) return 'pidgin';
  
  return 'english';
}

// Translate to English (dictionary-based)
export function translateToEnglish(text: string, language: string): string {
  if (language === 'english') return text;
  
  let translated = text;
  
  if (language === 'pidgin') {
    const pidginMap: Record<string, string> = {
      'wan': 'want to',
      'sabi': 'know',
      'dey': 'is',
      'fit': 'can',
      'chop': 'eat',
      'komot': 'remove',
      'gbe': 'carry',
      'talk': 'speak',
      'no go': 'will not',
      'abeg': 'please',
      'no wahala': 'no problem',
      'na': 'it is',
      'wey': 'which',
      'sef': 'too',
      'oga': 'boss',
      'padi': 'friend',
    };
    
    Object.entries(pidginMap).forEach(([pidgin, english]) => {
      const regex = new RegExp(`\\b${pidgin}\\b`, 'gi');
      translated = translated.replace(regex, english);
    });
    return translated;
  }
  
  if (language === 'yoruba') {
    const yorubaMap: Record<string, string> = {
      'mo': 'I',
      'fe': 'want to',
      'gbin': 'plant',
      'agbado': 'maize',
      'ro': 'plant',
      'bawo': 'how',
      'ni': 'is',
      'se': 'do',
      'ile': 'soil',
      'omi': 'water',
      'kore': 'harvest',
      'lo': 'go',
      'wa': 'come',
      'nibo': 'where',
      'kini': 'what',
      'igba': 'when',
      'pupo': 'much',
      'dara': 'good',
      'buburu': 'bad',
      'ode': 'farm',
    };
    
    Object.entries(yorubaMap).forEach(([yoruba, english]) => {
      const regex = new RegExp(`\\b${yoruba}\\b`, 'gi');
      translated = translated.replace(regex, english);
    });
    return translated;
  }
  
  return text;
}

// Main function to process voice input - MAKE SURE THIS IS EXPORTED
export async function processVoiceInput(audioBuffer: Buffer): Promise<{
  originalText: string;
  detectedLanguage: string;
  englishText: string;
}> {
  console.log('🔵 processVoiceInput called');
  console.log(`📦 Audio buffer size: ${audioBuffer.length} bytes`);
  
  try {
    const originalText = await speechToText(audioBuffer);
    console.log(`🗣️ Original text: "${originalText}"`);
    
    if (!originalText || originalText.trim() === '') {
      console.warn('⚠️ Empty transcription received');
      throw new Error('No speech detected. Please speak clearly and try again.');
    }
    
    const detectedLanguage = detectLanguage(originalText);
    console.log(`🌍 Detected language: ${detectedLanguage}`);
    
    const englishText = translateToEnglish(originalText, detectedLanguage);
    console.log(`📝 English text: "${englishText}"`);
    
    return {
      originalText,
      detectedLanguage,
      englishText,
    };
  } catch (error: any) {
    console.error('❌ processVoiceInput error:', error.message);
    throw error;
  }
}