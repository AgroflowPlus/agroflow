import { useEffect, useRef, useState } from 'react';
import styles from './VoiceWave.module.css';

interface VoiceWaveProps {
  isRecording: boolean;
  audioLevel?: number;
}

export function VoiceWave({ isRecording, audioLevel = 0 }: VoiceWaveProps) {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const animationRef    = useRef<number | null>(null);
  const historyRef      = useRef<number[]>([]);
  const isRecordingRef  = useRef(isRecording);
  const audioLevelRef   = useRef(audioLevel);   // ← live ref, no effect restart
  const [seconds, setSeconds] = useState(0);

  // Keep refs in sync with props — no effect needed
  isRecordingRef.current = isRecording;
  audioLevelRef.current  = audioLevel;

  // Timer
  useEffect(() => {
    if (!isRecording) { setSeconds(0); return; }
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Animation — runs ONCE, reads live refs inside
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    const sizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width  = parent.offsetWidth  * dpr;
      canvas.height = parent.offsetHeight * dpr;
    };
    sizeCanvas();

    const BAR_W        = 3 * dpr;
    const GAP          = 3 * dpr;
    const STEP         = BAR_W + GAP;
    const PUSH_MS      = 80;   // slower scroll — one new bar every 80ms
    let   lastPush     = 0;
    let   smoothLevel  = 0;    // smoothed amplitude

    const draw = (now: number) => {
      // Re-size if needed
      const parent = canvas.parentElement;
      if (parent) {
        const pw = parent.offsetWidth  * dpr;
        const ph = parent.offsetHeight * dpr;
        if (canvas.width !== pw || canvas.height !== ph) {
          canvas.width  = pw;
          canvas.height = ph;
        }
      }

      const W = canvas.width;
      const H = canvas.height;
      if (!W || !H) { animationRef.current = requestAnimationFrame(draw); return; }

      const recording = isRecordingRef.current;
      const maxBars   = Math.ceil(W / STEP) + 2;

      // Smooth the audio level so bars don't flicker wildly
      const rawLevel = audioLevelRef.current / 100;
      smoothLevel += (rawLevel - smoothLevel) * 0.25;

      if (recording && now - lastPush > PUSH_MS) {
        // Height driven by smoothed voice level + tiny organic noise
        const noise = (Math.random() - 0.5) * 0.08;
        const h = Math.max(0.04, Math.min(1, smoothLevel + noise));
        historyRef.current.push(h);
        if (historyRef.current.length > maxBars) historyRef.current.shift();
        lastPush = now;
      }

      // Decay on stop
      if (!recording) {
        historyRef.current = historyRef.current.map(v => v * 0.80);
        if (historyRef.current.every(v => v < 0.015)) historyRef.current = [];
      }

      ctx.clearRect(0, 0, W, H);

      const midY  = H / 2;
      const maxH  = H * 0.82;
      const bars  = historyRef.current;
      const count = bars.length;

      for (let i = 0; i < count; i++) {
        const x = W - (count - i) * STEP;
        if (x < -STEP) continue;

        const barH = Math.max(BAR_W * 1.5, bars[i] * maxH);
        const y    = midY - barH / 2;
        const r    = Math.min(BAR_W / 2, barH / 2);

        // Newest bars (right) are brightest
        const age   = i / Math.max(count - 1, 1);
        const alpha = recording ? 0.25 + age * 0.75 : bars[i] * 0.7;

        ctx.fillStyle = `rgba(78,204,163,${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + BAR_W - r, y);
        ctx.arcTo(x + BAR_W, y, x + BAR_W, y + r, r);
        ctx.lineTo(x + BAR_W, y + barH - r);
        ctx.arcTo(x + BAR_W, y + barH, x + BAR_W - r, y + barH, r);
        ctx.lineTo(x + r, y + barH);
        ctx.arcTo(x, y + barH, x, y + barH - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
        ctx.fill();
      }

      // Flat idle dots when silent
      if (historyRef.current.length === 0) {
        const idleCount = Math.floor(W / STEP);
        for (let i = 0; i < idleCount; i++) {
          ctx.fillStyle = 'rgba(78,204,163,0.12)';
          ctx.beginPath();
          ctx.arc(i * STEP + BAR_W / 2, midY, BAR_W / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []); // ← runs once only

  return (
    <div className={styles.waveContainer}>
      {isRecording && <div className={styles.recDot} />}
      {isRecording && <span className={styles.recTimer}>{fmt(seconds)}</span>}
      <div className={styles.canvasWrap}>
        <canvas ref={canvasRef} className={styles.waveCanvas} />
      </div>
    </div>
  );
}