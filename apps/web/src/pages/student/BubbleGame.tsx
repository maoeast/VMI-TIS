import { useEffect, useRef, useState } from 'react';

interface GameProps {
  disabled?: boolean;
  onComplete?: (
    result: 'pass' | 'fail',
    stats: { accuracyRate: number; clicks: number; pops: number },
  ) => void;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  a: number;
}

/**
 * 戳泡泡：泡泡沿正弦轨迹移动，点击命中计分。
 * 10 次点击为一轮，命中率 ≥80% 判定通过。
 */
export function BubbleGame({ disabled = false, onComplete }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    theta: 0,
    pos: { x: 400, y: 240, r: 34 },
    gaze: [] as Array<{ x: number; y: number }>,
    rings: [] as Ring[],
    clicks: 0,
    pops: 0,
  });
  const [score, setScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId = 0;

    const animate = () => {
      const state = stateRef.current;
      const w = canvas.width;
      const h = canvas.height;

      state.theta += 0.011 * 2;
      state.pos.x = w / 2 + Math.sin(state.theta) * (w * 0.34);
      state.pos.y = h / 2 + Math.sin(state.theta * 2) * (h * 0.3);

      const gx = state.pos.x - Math.cos(state.theta) * 7;
      const gy = state.pos.y - Math.cos(state.theta * 2) * 5;
      state.gaze.push({ x: gx, y: gy });
      if (state.gaze.length > 30) state.gaze.shift();

      ctx.clearRect(0, 0, w, h);

      const background = ctx.createLinearGradient(0, 0, w, h);
      background.addColorStop(0, '#0B3946');
      background.addColorStop(1, '#0F4C5C');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);

      if (state.gaze.length > 2) {
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        state.gaze.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      }

      const gradient = ctx.createRadialGradient(
        state.pos.x - 10,
        state.pos.y - 10,
        4,
        state.pos.x,
        state.pos.y,
        state.pos.r,
      );
      gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
      gradient.addColorStop(0.5, 'rgba(56,189,248,0.8)');
      gradient.addColorStop(1, 'rgba(16,185,129,0.9)');
      ctx.beginPath();
      ctx.arc(state.pos.x, state.pos.y, state.pos.r, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#FBBF24';
      ctx.stroke();

      ctx.fillStyle = '#0F4C5C';
      ctx.beginPath();
      ctx.arc(state.pos.x - 9, state.pos.y - 6, 3.5, 0, Math.PI * 2);
      ctx.arc(state.pos.x + 9, state.pos.y - 6, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(state.pos.x, state.pos.y + 3, 11, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#0F4C5C';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(gx, gy, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#10B981';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      for (let index = state.rings.length - 1; index >= 0; index -= 1) {
        const ring = state.rings[index];
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(251,191,36,${ring.a})`;
        ctx.lineWidth = 4;
        ctx.stroke();
        ring.r += 2.5;
        ring.a -= 0.05;
        if (ring.a <= 0) state.rings.splice(index, 1);
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    const state = stateRef.current;

    state.clicks += 1;
    const hit =
      Math.hypot(x - state.pos.x, y - state.pos.y) <= state.pos.r + 22;

    if (hit) {
      state.pops += 1;
      state.rings.push({
        x: state.pos.x,
        y: state.pos.y,
        r: state.pos.r,
        a: 1,
      });
      setScore(state.pops);
    }

    if (state.clicks >= 10) {
      const accuracyRate = state.pops / state.clicks;
      onComplete?.(accuracyRate >= 0.8 ? 'pass' : 'fail', {
        accuracyRate,
        clicks: state.clicks,
        pops: state.pops,
      });
      state.clicks = 0;
      state.pops = 0;
      state.rings = [];
      setScore(0);
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={480}
        onClick={handleClick}
        className="w-full cursor-crosshair rounded-2xl border-4 border-teal-500/60 shadow-2xl"
      />
      <div className="pointer-events-none absolute left-4 top-4 rounded-xl bg-black/30 px-3 py-1.5 text-sm font-bold text-white">
        泡泡追追看 · 得分 {score}
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 text-center text-xs text-teal-100/80">
        头不动，眼睛跟着泡泡走；听到「戳」再戳破。10 次点击为一轮。
      </div>
      {disabled && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/70 text-sm font-bold text-white">
          护眼休息中，游戏已暂停
        </div>
      )}
    </div>
  );
}
