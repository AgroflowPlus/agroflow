import { useState, useEffect, useRef } from 'react';
import { RiMicLine, RiStopCircleLine } from 'react-icons/ri';
import { useToast } from '../../context/ToastContext';
import styles from './VoiceRecorder.module.css';

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// Language dictionaries (100% free, no API calls)
const yorubaToEnglish: Record<string, string> = {
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

const pidginToEnglish: Record<string, string> = {
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

export function VoiceRecorder({ onTranscript, disabled }: VoiceRecorderProps) {
  const { addToast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Detect language from text
  const detectLanguage = (text: string): string => {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    
    // Check for Yoruba words
    const yorubaWords = Object.keys(yorubaToEnglish);
    const hasYoruba = words.some(w => yorubaWords.some(yw => w.includes(yw)));
    if (hasYoruba) return 'yoruba';
    
    // Check for Pidgin words
    const pidginWords = Object.keys(pidginToEnglish);
    const hasPidgin = words.some(w => pidginWords.includes(w));
    if (hasPidgin) return 'pidgin';
    
    return 'english';
  };

  // Translate to English
  const translateToEnglish = (text: string, language: string): string => {
    if (language === 'english') return text;
    
    let translated = text.toLowerCase();
    const dict = language === 'yoruba' ? yorubaToEnglish : pidginToEnglish;
    
    Object.entries(dict).forEach(([from, to]) => {
      const regex = new RegExp(`\\b${from}\\b`, 'gi');
      translated = translated.replace(regex, to);
    });
    
    return translated.trim();
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-NG';
    
    recognition.onstart = () => {
      setIsListening(true);
      addToast('🎤 Listening... Speak in English, Pidgin, or Yoruba', 'info');
    };
    
    recognition.onresult = (event: any) => {
      const rawText = event.results[0][0].transcript;
      console.log('🎤 Raw:', rawText);
      
      // Detect language
      const lang = detectLanguage(rawText);
      
      // Translate to English for AI
      const englishText = translateToEnglish(rawText, lang);
      console.log(`📝 ${lang} → English:`, englishText);
      
      // Pass to parent
      onTranscript(englishText);
      
      setIsListening(false);
      addToast(`🗣️ ${lang}: "${rawText}"`, 'success');
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      if (event.error !== 'not-allowed') {
        addToast('Could not recognize. Please try again.', 'error');
      }
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [addToast, onTranscript]);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start:', error);
        addToast('Could not start microphone. Please try again.', 'error');
      }
    } else {
      addToast('Voice input not supported in this browser. Try Chrome or Edge.', 'error');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  return (
    <div className={styles.voiceRecorder}>
      {!isListening ? (
        <button
          className={styles.micBtn}
          onClick={startListening}
          disabled={disabled}
          title="Speak in English, Pidgin, or Yoruba"
        >
          <RiMicLine size={20} />
        </button>
      ) : (
        <button
          className={styles.stopBtn}
          onClick={stopListening}
          title="Stop recording"
        >
          <RiStopCircleLine size={20} />
        </button>
      )}
    </div>
  );
}