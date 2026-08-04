import { useEffect, useRef } from "react";

// --- Types ---
export type AdinkraShape =
  | "OCTAGON"
  | "BUBBLES"
  | "TRIANGLES"
  | "SANKOFA_HEART"
  | "BEAR"
  | "WAVES";

export type ColorPalette = "GOLDEN" | "ROYAL" | "FIRE" | "OCEAN" | "NEON";

// --- Constants ---
const PALETTES: Record<ColorPalette, string[]> = {
  GOLDEN: ["#FFD700", "#B8860B", "#DAA520", "#554400"],
  ROYAL: ["#4B0082", "#8A2BE2", "#9400D3", "#E6E6FA"],
  FIRE: ["#FF4500", "#FF8C00", "#FF0000", "#8B0000"],
  OCEAN: ["#00CED1", "#4682B4", "#0000FF", "#191970"],
  NEON: ["#00FF00", "#FF00FF", "#00FFFF", "#FFFF00"],
};

// --- Shape Drawing Utility ---
const drawShape = (
  ctx: CanvasRenderingContext2D,
  type: AdinkraShape,
  size: number,
  time: number,
  color: string,
) => {
  const half = size / 2;
  ctx.fillStyle = color;
  ctx.beginPath();

  switch (type) {
    case "BUBBLES":
      ctx.arc(half, half, half * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.arc(half * 0.7, half * 0.7, half * 0.2, 0, Math.PI * 2);
      break;

    case "TRIANGLES":
      ctx.moveTo(half, 0);
      ctx.lineTo(size, size);
      ctx.lineTo(0, size);
      break;

    case "WAVES":
      for (let i = 0; i <= size; i++) {
        const y = half + Math.sin(i * 0.1 + time) * (size / 4);
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
      return;

    case "SANKOFA_HEART": {
      const x = half, y = half;
      ctx.moveTo(x, y + half / 4);
      ctx.bezierCurveTo(x, y, x - half, y, x - half, y - half / 2);
      ctx.bezierCurveTo(x - half, y - size, x, y - size, x, y - half / 2);
      ctx.bezierCurveTo(x, y - size, x + half, y - size, x + half, y - half / 2);
      ctx.bezierCurveTo(x + half, y, x, y, x, y + half / 4);
      break;
    }

    case "BEAR":
      ctx.arc(half, half, half * 0.6, 0, Math.PI * 2);
      ctx.arc(half * 0.4, half * 0.4, half * 0.2, 0, Math.PI * 2);
      ctx.arc(half * 1.6, half * 0.4, half * 0.2, 0, Math.PI * 2);
      break;

    case "OCTAGON": {
      const t = size / 3;
      ctx.moveTo(t, 0);
      ctx.lineTo(size - t, 0);
      ctx.lineTo(size, t);
      ctx.lineTo(size, size - t);
      ctx.lineTo(size - t, size);
      ctx.lineTo(t, size);
      ctx.lineTo(0, size - t);
      ctx.lineTo(0, t);
      break;
    }

    default:
      ctx.rect(0, 0, size, size);
  }
  ctx.fill();
  ctx.closePath();
};

export default function MetallicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const timeRef = useRef(0);

  // Maintain config in ref to avoid effect recreation interrupting the animation loop
  const configRef = useRef({
    speed: 1.5,
    density: 80,
    waveAmplitude: 20,
    shape: "OCTAGON" as AdinkraShape,
    palette: "GOLDEN" as ColorPalette,
  });

  useEffect(() => {
    const handleConfigUpdate = (event: CustomEvent) => {
      configRef.current = { ...configRef.current, ...event.detail };
    };

    window.addEventListener("adinkra-config-update", handleConfigUpdate as EventListener);
    // Notify Remote Control of default config so sliders sync
    window.dispatchEvent(new CustomEvent("adinkra-config-sync", { detail: configRef.current }));

    return () => {
      window.removeEventListener("adinkra-config-update", handleConfigUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const update = () => {
      const config = configRef.current;

      // Set resolution safely
      if (canvas.style.width !== `${window.innerWidth}px`) {
        handleResize();
      }

      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      timeRef.current += config.speed * 0.02;
      const t = timeRef.current;
      const size = config.density;
      const cols = Math.ceil(window.innerWidth / size) + 2;
      const rows = Math.ceil(window.innerHeight / size) + 2;

      for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          const baseX = c * size;
          const baseY = r * size;

          // Wave Logic
          const offsetX = Math.sin(t + r * 0.5) * config.waveAmplitude;
          const offsetY = Math.cos(t + c * 0.5) * config.waveAmplitude;

          // Dynamic Coloring
          const p = PALETTES[config.palette];
          const colorIdx = Math.floor(
            Math.abs(Math.sin(t * 0.5 + (r + c) * 0.2)) * p.length
          ) % p.length;
          const color = p[colorIdx];

          ctx.save();
          ctx.translate(baseX + offsetX, baseY + offsetY);

          // Metallic Rotation
          const rot = Math.sin(t * 0.2 + r * c) * 0.2;
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

    handleResize();
    requestRef.current = requestAnimationFrame(update);

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 block pointer-events-none"
      aria-hidden
    />
  );
}
