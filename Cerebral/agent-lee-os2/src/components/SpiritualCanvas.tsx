import { useEffect, useRef, useState } from "react";

// --- SHAPE DRAWING ENGINE ---
const drawShape = (ctx: CanvasRenderingContext2D, type: string, size: number, time: number, color: string) => {
  const half = size / 2;
  ctx.fillStyle = color;
  ctx.beginPath();

  switch (type) {
    case 'BUBBLES':
      ctx.arc(half, half, half * 0.8, 0, Math.PI * 2);
      ctx.fill();
      // Shine on bubble
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.arc(half * 0.7, half * 0.7, half * 0.2, 0, Math.PI * 2);
      break;

    case 'TRIANGLES':
      ctx.moveTo(half, 0);
      ctx.lineTo(size, size);
      ctx.lineTo(0, size);
      break;

    case 'WAVES':
      for (let i = 0; i <= size; i++) {
        const y = half + Math.sin(i * 0.1 + time) * (size / 4);
        if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
      return;

    case 'SANKOFA_HEART': // Heart
      const x = half, y = half;
      ctx.moveTo(x, y + half / 4);
      ctx.bezierCurveTo(x, y, x - half, y, x - half, y - half / 2);
      ctx.bezierCurveTo(x - half, y - size, x, y - size, x, y - half / 2);
      ctx.bezierCurveTo(x, y - size, x + half, y - size, x + half, y - half / 2);
      ctx.bezierCurveTo(x + half, y, x, y, x, y + half / 4);
      break;

    case 'BEAR': // Teddy Bear logic
      ctx.arc(half, half, half * 0.6, 0, Math.PI * 2); // Head
      ctx.arc(half * 0.4, half * 0.4, half * 0.2, 0, Math.PI * 2); // Left Ear
      ctx.arc(half * 1.6, half * 0.4, half * 0.2, 0, Math.PI * 2); // Right Ear
      break;

    case 'OCTAGON': // Metallic look
    default:
      const t = size / 3;
      ctx.moveTo(t, 0); ctx.lineTo(size - t, 0); ctx.lineTo(size, t);
      ctx.lineTo(size, size - t); ctx.lineTo(size - t, size);
      ctx.lineTo(t, size); ctx.lineTo(0, size - t); ctx.lineTo(0, t);
      break;
  }
  ctx.fill();
  ctx.closePath();
};

export default function SpiritualCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  // Configuration State - Matches precisely the user's requested logic
  const [config, setConfig] = useState<any>({
    speed: 1.5,
    density: 80,
    waveAmplitude: 20,
    shape: 'OCTAGON',
    palette: 'GOLDEN'
  });

  // Color Palettes
  const palettes: Record<string, string[]> = {
    GOLDEN: ['#FFD700', '#B8860B', '#DAA520', '#554400'],
    ROYAL: ['#4B0082', '#8A2BE2', '#9400D3', '#E6E6FA'],
    FIRE: ['#FF4500', '#FF8C00', '#FF0000', '#8B0000'],
    OCEAN: ['#00CED1', '#4682B4', '#0000FF', '#191970'],
    NEON: ['#00FF00', '#FF00FF', '#00FFFF', '#FFFF00']
  };

  useEffect(() => {
    // Sync with global config events from Screensaver
    const handleConfigUpdate = (e: any) => {
      if (e.detail) {
        setConfig((prev: any) => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener("adinkra-config-update", handleConfigUpdate);

    // Push initial state to sync any receivers
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("adinkra-config-sync", { detail: config }));
    }, 0);

    return () => window.removeEventListener("adinkra-config-update", handleConfigUpdate);
  }, []);

  useEffect(() => {
    const update = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set resolution to fill the entire window
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      // Clear the canvas each frame to maintain transparency allowing themes to show through
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      timeRef.current += config.speed * 0.02;
      const t = timeRef.current;
      const size = config.density;
      const cols = Math.ceil(canvas.width / size) + 2;
      const rows = Math.ceil(canvas.height / size) + 2;

      for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          const baseX = c * size;
          const baseY = r * size;

          // Wave Logic
          const offsetX = Math.sin(t + (r * 0.5)) * config.waveAmplitude;
          const offsetY = Math.cos(t + (c * 0.5)) * config.waveAmplitude;

          // Dynamic Coloring
          const p = palettes[config.palette] || palettes['GOLDEN'];
          const colorIdx = Math.floor(Math.abs(Math.sin(t * 0.5 + (r + c) * 0.2)) * p.length);
          const color = p[colorIdx % p.length];

          ctx.save();
          ctx.translate(baseX + offsetX, baseY + offsetY);

          // Metallic Rotation
          const rot = Math.sin(t * 0.2 + (r * c)) * 0.2;
          ctx.translate(size / 2, size / 2);
          ctx.rotate(rot);
          ctx.translate(-size / 2, -size / 2);

          // Global Alpha for "Glow"
          ctx.globalAlpha = 0.6 + Math.sin(t + r) * 0.3;

          drawShape(ctx, config.shape, size * 0.8, t, color);

          ctx.restore();
        }
      }
      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [config]);

  return (
    <div className="fixed inset-0 z-0 w-screen h-screen" style={{ zIndex: -1 }}>
      <canvas ref={canvasRef} className="block w-screen h-screen object-cover" />
    </div>
  );
}
