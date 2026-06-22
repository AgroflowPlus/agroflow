import {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { RiMicLine } from "react-icons/ri";
import { MdClose } from "react-icons/md";
import { useToast } from "../../context/ToastContext";
import styles from "./VoiceRecorder.module.css";

export interface VoiceRecorderHandle {
  stopAndSend: () => void;
}

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onAudioLevel?: (level: number) => void;
}

export const VoiceRecorder = forwardRef<
  VoiceRecorderHandle,
  VoiceRecorderProps
>(({ onTranscript, disabled, onRecordingStateChange, onAudioLevel }, ref) => {
  const { addToast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelFrameRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  // Expose stopAndSend to parent via ref
  useImperativeHandle(ref, () => ({
    stopAndSend: () => {
      if (mediaRecorderRef.current && isRecording) {
        cancelledRef.current = false;
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setIsProcessing(true);
        onRecordingStateChange?.(false);
      }
    },
  }));

  useEffect(() => {
    return () => {
      stopAudioContext();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stopAudioContext = () => {
    if (levelFrameRef.current) cancelAnimationFrame(levelFrameRef.current);
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  const startLevelMonitor = (stream: MediaStream) => {
    const ctx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyserRef.current = analyser;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((s, v) => s + v, 0) / data.length;
      onAudioLevel?.(Math.round((avg / 255) * 100));
      levelFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      cancelledRef.current = false;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stopAudioContext();
        stream.getTracks().forEach((t) => t.stop());
        onAudioLevel?.(0);

        if (cancelledRef.current) {
          setIsRecording(false);
          setIsProcessing(false);
          onRecordingStateChange?.(false);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        await processAudio(audioBlob);
      };

      startLevelMonitor(stream);
      mediaRecorder.start();
      setIsRecording(true);
      onRecordingStateChange?.(true);
    } catch (error) {
      console.error("Microphone error:", error);
      addToast("Could not access microphone. Check permissions.", "error");
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      cancelledRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(false);
      onRecordingStateChange?.(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      const token = localStorage.getItem("agf_token");
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const res = await fetch(`${import.meta.env.VITE_API_URL}/voice/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        addToast(`🗣️ "${data.originalText}"`, "success");
        onTranscript(data.response);
      } else {
        addToast(data.error || "Failed to process voice", "error");
        onTranscript("");
      }
    } catch (error) {
      console.error("Voice processing error:", error);
      addToast("Failed to process voice. Please try again.", "error");
      onTranscript("");
    } finally {
      setIsProcessing(false);
      onRecordingStateChange?.(false);
    }
  };

  // Processing state
  if (isProcessing) {
    return (
      <div className={styles.voiceRecorder}>
        <div className={styles.processingSpinner}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

if (isRecording) {
  return (
    <div className={styles.voiceRecorder}>
      <button
        className={styles.cancelBtn}
        onClick={cancelRecording}
        title="Cancel recording"
        aria-label="Cancel recording"
      >
        <MdClose size={16} />
      </button>
      <button
        className={`${styles.micBtn} ${styles.micBtnRecording}`}
        title="Recording… tap send to finish"
        aria-label="Recording in progress"
        onClick={() => {}} // send button handles stop
      >
        <RiMicLine size={20} />
      </button>
    </div>
  );
}


return (
  <div className={styles.voiceRecorder}>
    {/* Always keep the cancel button in the DOM, but hidden when not recording */}
    <button
      className={`${styles.cancelBtn} ${!isRecording ? styles.cancelBtnHidden : ''}`}
      onClick={cancelRecording}
      title="Cancel recording"
      aria-label="Cancel recording"
      style={{ visibility: isRecording ? 'visible' : 'hidden', width: isRecording ? '32px' : '0', padding: isRecording ? '' : '0', margin: isRecording ? '' : '0', border: isRecording ? '' : 'none' }}
    >
      <MdClose size={16} />
    </button>
    <button
      className={`${styles.micBtn} ${isRecording ? styles.micBtnRecording : ''}`}
      onClick={isRecording ? () => {} : startRecording}
      disabled={disabled || isRecording}
      title={isRecording ? "Recording…" : "Speak in English, Pidgin, or Yoruba"}
      aria-label={isRecording ? "Recording in progress" : "Start voice recording"}
    >
      <RiMicLine size={20} />
    </button>
  </div>
);
  
});

VoiceRecorder.displayName = "VoiceRecorder";
