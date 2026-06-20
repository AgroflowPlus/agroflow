// import OpenAI from 'openai';

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// // Simple language detection
// const yorubaWords = ['mo', 'fe', 'gbin', 'agbado', 'ro', 'bawo', 'ni', 'se', 'mi', 're', 'ode', 'ile'];
// const pidginWords = ['wan', 'sabi', 'dey', 'fit', 'chop', 'komot', 'gbe', 'talk', 'abeg', 'no wahala'];

// export async function speechToText(audioBuffer: Buffer): Promise<string> {
//   try {
//     // Convert buffer to a format Whisper accepts - FIXED
//     const audioBlob = new Blob([audioBuffer.buffer], { type: 'audio/webm' });
    
//     // Create a File object from the blob
//     const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
    
//     const transcription = await openai.audio.transcriptions.create({
//       file: file,
//       model: 'whisper-1',
//     });
    
//     return transcription.text;
//   } catch (error) {
//     console.error('Speech-to-text error:', error);
//     throw new Error('Failed to convert speech to text');
//   }
// }

// export function detectLanguage(text: string): string {
//   const lowerText = text.toLowerCase();
//   const words = lowerText.split(/\s+/);
  
//   let yorubaScore = words.filter(w => yorubaWords.some(yw => w.includes(yw))).length;
//   let pidginScore = words.filter(w => pidginWords.some(pw => w === pw)).length;
  
//   if (yorubaScore > pidginScore && yorubaScore > 0) return 'yoruba';
//   if (pidginScore > 0) return 'pidgin';
//   return 'english';
// }

// export function translateToEnglish(text: string, language: string): string {
//   if (language === 'english') return text;
  
//   let translated = text;
  
//   if (language === 'pidgin') {
//     const pidginMap: Record<string, string> = {
//       'wan': 'want',
//       'sabi': 'know',
//       'dey': 'is',
//       'fit': 'can',
//       'chop': 'eat',
//       'komot': 'remove',
//       'gbe': 'carry',
//       'talk': 'speak',
//       'no go': 'will not',
//       'abeg': 'please',
//       'no wahala': 'no problem',
//     };
    
//     Object.entries(pidginMap).forEach(([pidgin, english]) => {
//       const regex = new RegExp(`\\b${pidgin}\\b`, 'gi');
//       translated = translated.replace(regex, english);
//     });
//     return translated;
//   }
  
//   if (language === 'yoruba') {
//     const yorubaMap: Record<string, string> = {
//       'mo': 'I',
//       'fe': 'want to',
//       'gbin': 'plant',
//       'agbado': 'maize',
//       'ro': 'plant',
//       'bawo': 'how',
//       'ni': 'is',
//       'se': 'do',
//       'ile': 'soil',
//       'omi': 'water',
//       'kore': 'harvest',
//       'lo': 'go',
//       'wa': 'come',
//       'nibo': 'where',
//       'kini': 'what',
//       'igba': 'when',
//       'pupo': 'much',
//       'dara': 'good',
//       'buburu': 'bad',
//     };
    
//     Object.entries(yorubaMap).forEach(([yoruba, english]) => {
//       const regex = new RegExp(`\\b${yoruba}\\b`, 'gi');
//       translated = translated.replace(regex, english);
//     });
//     return translated;
//   }
  
//   return text;
// }

// export function translateFromEnglish(text: string, targetLanguage: string): string {
//   if (targetLanguage === 'english') return text;
  
//   let translated = text;
  
//   if (targetLanguage === 'pidgin') {
//     const pidginMap: Record<string, string> = {
//       'want to': 'wan',
//       'know': 'sabi',
//       'is': 'dey',
//       'can': 'fit',
//       'eat': 'chop',
//       'remove': 'komot',
//       'carry': 'gbe',
//       'speak': 'talk',
//       'will not': 'no go',
//       'please': 'abeg',
//       'no problem': 'no wahala',
//     };
    
//     Object.entries(pidginMap).forEach(([english, pidgin]) => {
//       const regex = new RegExp(`\\b${english}\\b`, 'gi');
//       translated = translated.replace(regex, pidgin);
//     });
//     return translated;
//   }
  
//   if (targetLanguage === 'yoruba') {
//     const yorubaMap: Record<string, string> = {
//       'I': 'mo',
//       'want to': 'fe',
//       'plant': 'gbin',
//       'maize': 'agbado',
//       'soil': 'ile',
//       'water': 'omi',
//       'harvest': 'kore',
//       'good': 'dara',
//       'bad': 'buburu',
//     };
    
//     Object.entries(yorubaMap).forEach(([english, yoruba]) => {
//       const regex = new RegExp(`\\b${english}\\b`, 'gi');
//       translated = translated.replace(regex, yoruba);
//     });
//     return translated;
//   }
  
//   return text;
// }

// export async function processVoiceInput(audioBuffer: Buffer): Promise<{
//   originalText: string;
//   detectedLanguage: string;
//   englishText: string;
//   response: string;
// }> {
//   const originalText = await speechToText(audioBuffer);
//   const detectedLanguage = detectLanguage(originalText);
//   const englishText = translateToEnglish(originalText, detectedLanguage);
  
//   return {
//     originalText,
//     detectedLanguage,
//     englishText,
//     response: '',
//   };
// }