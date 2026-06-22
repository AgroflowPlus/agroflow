import { useEffect, useRef, useState } from 'react';
import styles from './VoiceWave.module.css';

interface VoiceWaveProps {
  isRecording: boolean;
  audioLevel?: number;
}

export function VoiceWave({ isRecording, audioLevel = 0 }: VoiceWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const historyRef = useRef<number[]>([]);
  const [seconds, setSeconds] = useState(0);

  // Timer
  useEffect(() => {
    if (!isRecording) { setSeconds(0); return; }
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();

    const BAR_W = 3 * dpr;
    const GAP   = 2.5 * dpr;
    const STEP  = BAR_W + GAP;

    let lastPush = 0;
    const PUSH_INTERVAL = 45; // ms — controls scroll speed

    const draw = (now: number) => {
      const W = canvas.width;
      const H = canvas.height;
      if (!W || !H) { animationRef.current = requestAnimationFrame(draw); return; }

      const maxBars = Math.ceil(W / STEP) + 2;

      // Push a new bar on interval
      if (isRecording && now - lastPush > PUSH_INTERVAL) {
        const level = audioLevel / 100;
        const noise = (Math.random() - 0.5) * 0.18;
        const h = Math.max(0.06, Math.min(1, level + noise));
        historyRef.current.push(h);
        if (historyRef.current.length > maxBars) historyRef.current.shift();
        lastPush = now;
      }

      // Decay bars when stopped
      if (!isRecording) {
        historyRef.current = historyRef.current.map(v => v * 0.82);
        if (historyRef.current.every(v => v < 0.02)) historyRef.current = [];
      }

      ctx.clearRect(0, 0, W, H);

      const midY  = H / 2;
      const maxH  = H * 0.80;
      const bars  = historyRef.current;
      const count = bars.length;

      for (let i = 0; i < count; i++) {
        const x = W - (count - i) * STEP;
        if (x < -STEP) continue;

        const barH  = Math.max(BAR_W, bars[i] * maxH);
        const y     = midY - barH / 2;
        const r     = Math.min(BAR_W / 2, barH / 2);
        const age   = i / Math.max(count - 1, 1); // 0=oldest, 1=newest
        const alpha = isRecording
          ? 0.3 + age * 0.7
          : bars[i] * 0.75;

        ctx.fillStyle = `rgba(78, 204, 163, ${alpha.toFixed(2)})`;

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

      // Flat idle bars when empty
      if (historyRef.current.length === 0) {
        const idleCount = Math.floor(W / STEP);
        for (let i = 0; i < idleCount; i++) {
          const x    = i * STEP;
          const barH = BAR_W;
          const y    = midY - barH / 2;
          ctx.fillStyle = 'rgba(78,204,163,0.12)';
          ctx.fillRect(x, y, BAR_W, barH);
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRecording, audioLevel]);

  return (
    <div className={styles.waveContainer}>
      {isRecording && <div className={styles.recDot} />}
      {isRecording && <span className={styles.recTimer}>{fmt(seconds)}</span>}
      <canvas ref={canvasRef} className={styles.waveCanvas} />
    </div>
  );
}