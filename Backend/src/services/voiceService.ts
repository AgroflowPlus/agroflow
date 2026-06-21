import axios from 'axios';
import FormData from 'form-data';

const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;

// Model endpoints that work on the free tier
const MODELS = {
  // For English and mixed languages
  english: 'jonatasgrosman/wav2vec2-large-xlsr-53-english',
  // For multilingual (supports Yoruba, Pidgin, etc.)
  multilingual: 'facebook/wav2vec2-large-xlsr-53',
  // For Yoruba specifically (if you want to train it later)
  yoruba: 'facebook/wav2vec2-large-xlsr-53-yoruba',
};

export async function speechToText(audioBuffer: Buffer): Promise<string> {
  try {
    // First try the multilingual model (works for all languages)
    const formData = new FormData();
    formData.append('audio', audioBuffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm',
    });

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${MODELS.multilingual}`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_TOKEN}`,
          ...formData.getHeaders(),
        },
        timeout: 30000, // 30 second timeout
      }
    );

    // If the response is successful, it will have a "text" field
    if (response.data && response.data.text) {
      return response.data.text;
    }

    // If the response is an array (some models return this format)
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data[0].text || '';
    }

    return '';
  } catch (error: any) {
    console.error('Speech-to-text error:', error.message);
    
    // If the model is loading, Hugging Face returns a 503 with instructions
    if (error.response?.status === 503) {
      console.log('⏳ Model is loading, retry in 5 seconds...');
      // Wait and retry once
      await new Promise(resolve => setTimeout(resolve, 5000));
      return speechToText(audioBuffer); // Retry
    }
    
    throw new Error('Failed to convert speech to text');
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

export async function processVoiceInput(audioBuffer: Buffer): Promise<{
  originalText: string;
  detectedLanguage: string;
  englishText: string;
}> {
  const originalText = await speechToText(audioBuffer);
  const detectedLanguage = detectLanguage(originalText);
  const englishText = translateToEnglish(originalText, detectedLanguage);
  
  return {
    originalText,
    detectedLanguage,
    englishText,
  };
}