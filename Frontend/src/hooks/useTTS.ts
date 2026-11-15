import { useCallback, useRef } from 'react';
import { BASE_URL } from '../services/apiConfig';

export function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Helper to speak using the device's built-in voice (Fallback)
  const speakFallback = useCallback((text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Device does not support speech synthesis');
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel(); // Stop any current device speech
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-NG';
    
    // Clean up markdown characters so it doesn't read "asterisk"
    u.text = text.replace(/[*#_]/g, ''); 

    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();
    
    window.speechSynthesis.speak(u);
  }, []);

  const speak = useCallback(async (
    text: string,
    language: string = 'english',
    onEnd?: () => void,
  ) => {
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis.cancel(); // Stop any device speech

      const token = localStorage.getItem('agf_token');

      const res = await fetch(`${BASE_URL}/voice/speak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, language }),
      });

      // 2. If backend says TTS is unavailable, use device voice
      if (!res.ok) {
        console.warn('Backend TTS unavailable, using device voice fallback.');
        speakFallback(text, onEnd);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        speakFallback(text, onEnd);
        return;
      }

      // 3. Native Base64 to Audio Playback (Safer for mobile)
      const mimeType = data.mimeType || 'audio/mpeg';
      const audioUrl = `data:${mimeType};base64,${data.audio}`;
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        audioRef.current = null;
        onEnd?.();
      };

      audio.onerror = (e) => {
        console.error("Audio playback failed", e);
        // If the browser fails to play the audio, try the device voice
        speakFallback(text, onEnd); 
      };

      await audio.play();

    } catch (err: any) {
      console.error('TTS fetch error:', err.message);
      // 4. If the network completely fails (e.g., offline), use device voice
      speakFallback(text, onEnd);
    }
  }, [speakFallback]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();
  }, []);

  return { speak, stop };
}
