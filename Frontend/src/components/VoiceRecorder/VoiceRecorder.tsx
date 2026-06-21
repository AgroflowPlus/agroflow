import { useState, useEffect, useRef } from 'react';
import { RiMicLine, RiStopCircleLine } from 'react-icons/ri';
import { useToast } from '../../context/ToastContext';
import styles from './VoiceRecorder.module.css';

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

export function VoiceRecorder({ onTranscript, disabled, onRecordingStateChange }: VoiceRecorderProps) {
  const { addToast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  // Fix: Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        if (onRecordingStateChange) onRecordingStateChange(false);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      if (onRecordingStateChange) onRecordingStateChange(true);
      addToast('🎤 Recording... Speak clearly', 'info');
      
    } catch (error) {
      console.error('Microphone error:', error);
      addToast('Could not access microphone. Please check permissions.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      addToast('⏳ Processing voice...', 'info');
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      const token = localStorage.getItem('agf_token');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const res = await fetch(`${import.meta.env.VITE_API_URL}/voice/process`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      
      const data = await res.json();
      
      if (data.success) {
        addToast(`🗣️ "${data.originalText}"`, 'success');
        onTranscript(data.response);
      } else {
        addToast(data.error || 'Failed to process voice', 'error');
        onTranscript('');
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      addToast('Failed to process voice. Please try again.', 'error');
      onTranscript('');
    } finally {
      setIsProcessing(false);
      if (onRecordingStateChange) onRecordingStateChange(false);
    }
  };

  return (
    <div className={styles.voiceRecorder}>
      {!isRecording && !isProcessing ? (
        <button
          className={styles.micBtn}
          onClick={startRecording}
          disabled={disabled}
          title="Click to speak (English, Pidgin, or Yoruba)"
        >
          <RiMicLine size={20} />
        </button>
      ) : isProcessing ? (
        <div className={styles.processingSpinner}>
          <div className={styles.spinner}></div>
        </div>
      ) : (
        <button
          className={styles.stopBtn}
          onClick={stopRecording}
          title="Stop recording"
        >
          <RiStopCircleLine size={20} />
        </button>
      )}
    </div>
  );
}