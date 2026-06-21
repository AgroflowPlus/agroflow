import { useEffect, useRef } from 'react';
import styles from './VoiceWave.module.css';

interface VoiceWaveProps {
  isRecording: boolean;
  audioLevel?: number;
}

export function VoiceWave({ isRecording, audioLevel = 0 }: VoiceWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;
    const barWidth = 4;
    const barCount = 40;
    const gap = 2;
    
    const drawWave = () => {
      ctx.clearRect(0, 0, width, height);
      
      const centerY = height / 2;
      const totalWidth = barCount * (barWidth + gap);
      const startX = (width - totalWidth) / 2;
      
      for (let i = 0; i < barCount; i++) {
        const x = startX + i * (barWidth + gap);
        
        let barHeight: number;
        if (isRecording) {
          const randomFactor = Math.random() * 0.8 + 0.2;
          const levelFactor = audioLevel / 100;
          barHeight = (10 + Math.sin(Date.now() / 200 + i) * 5 + 5) * (0.5 + levelFactor * 0.5) * randomFactor;
          barHeight = Math.max(5, Math.min(barHeight, 40));
        } else {
          barHeight = 8;
        }
        
        const y = centerY - barHeight / 2;
        
        const alpha = isRecording ? 0.8 + Math.random() * 0.2 : 0.3;
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        if (isRecording) {
          gradient.addColorStop(0, `rgba(168, 216, 50, ${alpha})`);
          gradient.addColorStop(0.5, `rgba(45, 106, 53, ${alpha})`);
          gradient.addColorStop(1, `rgba(168, 216, 50, ${alpha})`);
        } else {
          gradient.addColorStop(0, `rgba(158, 173, 159, ${alpha})`);
          gradient.addColorStop(1, `rgba(158, 173, 159, ${alpha})`);
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        // Use arc for rounded corners instead of roundRect
        const radius = 2;
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, y + barHeight - radius);
        ctx.quadraticCurveTo(x + barWidth, y + barHeight, x + barWidth - radius, y + barHeight);
        ctx.lineTo(x + radius, y + barHeight);
        ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.fill();
      }
      
      if (isRecording) {
        animationRef.current = requestAnimationFrame(drawWave);
      }
    };
    
    drawWave();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, audioLevel]);

  return (
    <div className={`${styles.waveContainer} ${isRecording ? styles.recording : ''}`}>
      <canvas
        ref={canvasRef}
        width={400}
        height={60}
        className={styles.waveCanvas}
      />
      {isRecording && (
        <div className={styles.recordingIndicator}>
          <div className={styles.recordingDot}></div>
          <span>Recording...</span>
        </div>
      )}
    </div>
  );
}