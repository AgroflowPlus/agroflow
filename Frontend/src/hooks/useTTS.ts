import { useCallback, useRef } from 'react';

const LANG_MAP: Record<string, string> = {
  english: 'en-NG',  // Nigerian English accent
  yoruba:  'yo',
  pidgin:  'en-NG',  // No Pidgin voice exists — use Nigerian English
};

export function useTTS() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, language: string = 'english') => {
    if (!window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang  = LANG_MAP[language] ?? 'en-NG';
    utterance.rate  = 0.92;   // slightly slower — easier to understand
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const match  = voices.find(v =>
      v.lang.startsWith(utterance.lang.split('-')[0])
    );
    if (match) utterance.voice = match;

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  return { speak, stop };
}