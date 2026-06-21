import axios from 'axios';
import FormData from 'form-data';

const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;

// Model endpoints that work on the free tier
const MODELS = {
  multilingual: 'facebook/wav2vec2-large-xlsr-53',
};

export async function speechToText(audioBuffer: Buffer): Promise<string> {
  try {
    console.log('🎤 Sending audio to Hugging Face...');
    console.log(`📦 Audio size: ${audioBuffer.length} bytes`);
    
    // Log first few bytes for debugging
    console.log(`📦 Audio first 50 bytes: ${audioBuffer.slice(0, 50).toString('hex')}`);
    
    const formData = new FormData();
    formData.append('audio', audioBuffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm',
    });

    console.log(`🔑 Using token: ${HUGGINGFACE_TOKEN ? 'Token exists (first 10 chars: ' + HUGGINGFACE_TOKEN.substring(0, 10) + '...)' : '❌ NO TOKEN!'}`);
    console.log(`🌐 Calling Hugging Face API: ${MODELS.multilingual}`);

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${MODELS.multilingual}`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_TOKEN}`,
          ...formData.getHeaders(),
        },
        timeout: 60000, // 60 second timeout (models can take time to load)
      }
    );

    console.log(`📝 Response status: ${response.status}`);
    console.log(`📝 Response data:`, JSON.stringify(response.data).substring(0, 500));

    if (response.data && response.data.text) {
      console.log(`✅ Transcription: "${response.data.text}"`);
      return response.data.text;
    }

    if (Array.isArray(response.data) && response.data.length > 0) {
      const text = response.data[0].text || '';
      console.log(`✅ Transcription: "${text}"`);
      return text;
    }

    console.warn('⚠️ Unexpected response format:', JSON.stringify(response.data));
    return '';
  } catch (error: any) {
    console.error('❌ Speech-to-text error:', error.message);
    
    if (error.response) {
      console.error(`📡 Status: ${error.response.status}`);
      console.error(`📡 Data:`, JSON.stringify(error.response.data));
      
      if (error.response.status === 503) {
        console.log('⏳ Model is loading, waiting 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        console.log('🔄 Retrying...');
        return speechToText(audioBuffer);
      }
      
      if (error.response.status === 401) {
        console.error('❌ Invalid Hugging Face token! Please check your HUGGINGFACE_TOKEN');
        throw new Error('Invalid Hugging Face token. Please check your configuration.');
      }
      
      if (error.response.status === 429) {
        console.error('❌ Rate limit exceeded! Please wait and try again.');
        throw new Error('Rate limit exceeded. Please try again later.');
      }
    }
    
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