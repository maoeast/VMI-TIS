import { useEffect, useRef, useState } from 'react';

interface GameProps {
  disabled?: boolean;
  onComplete?: (
    result: 'pass' | 'fail',
    stats: { accuracyRate: number; clicks: number; pops: number },
  ) => void;
}

type Focus = 'red' | 'green' | 'yellow';

const FOCUS_COLORS: Record<Focus, string> = {
  red: '#EF4444',
  green: '#10B981',
  yellow: '#F59E0B',
};

/**
 * 聚散球 Brock 线：三球远近注视，训练集合/散开与生理复视。
 */
export function BrockGame({ disabled = false, onComplete }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [focus, setFocus] = useState<Focus>('red');
  const [distance, setDistance] = useState(25);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const background = ctx.createLinearGradient(0, 0, w, h);
    background.addColorStop(0, '#0B3946');
    background.addColorStop(1, '#0F4C5C');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);

    const leftEye = { x: 50, y: h / 2 - 26 };
    const rightEye = { x: 50, y: h / 2 + 26 };
    const redX = 110 + ((distance - 4) / 31) * (w * 0.25);
    const greenX = w * 0.56;
    const yellowX = w * 0.82;
    const focusX = focus === 'red' ? redX : focus === 'green' ? greenX : yellowX;

    ctx.strokeStyle = 'rgba(56,189,248,0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const slopeLeft = (h / 2 - leftEye.y) / (focusX - leftEye.x);
    ctx.moveTo(leftEye.x, leftEye.y);
    ctx.lineTo(w - 30, leftEye.y + slopeLeft * (w - 30 - leftEye.x));
    const slopeRight = (h / 2 - rightEye.y) / (focusX - rightEye.x);
    ctx.moveTo(rightEye.x, rightEye.y);
    ctx.lineTo(w - 30, rightEye.y + slopeRight * (w - 30 - rightEye.x));
    ctx.stroke();

    [leftEye, rightEye].forEach((eye) => {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(eye.x, eye.y, 11, 0, Math.PI * 2);
      ctx.fill();
    });

    [
      { id: 'red' as Focus, x: redX, name: `红球(${distance}cm)` },
      { id: 'green' as Focus, x: greenX, name: '绿球(60cm)' },
      { id: 'yellow' as Focus, x: yellowX, name: '黄球(90cm)' },
    ].forEach((ball) => {
      const active = ball.id === focus;
      ctx.beginPath();
      ctx.arc(ball.x, h / 2, active ? 19 : 13, 0, Math.PI * 2);
      ctx.fillStyle = FOCUS_COLORS[ball.id];
      ctx.fill();
      if (active) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(ball.name, ball.x - 30, h / 2 - 28);
    });

    ctx.fillStyle = '#99F6E4';
    ctx.font = '13px "Microsoft YaHei", sans-serif';
    ctx.fillText('红球移近时保持单视；出现复视回到上一个清晰点。', 24, h - 18);
  }, [focus, distance]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={720}
        height={360}
        className="w-full rounded-2xl border-4 border-teal-500/60 shadow-2xl"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(['red', 'green', 'yellow'] as Focus[]).map((item) => (
          <button
            key={item}
            type="button"
            disabled={disabled}
            onClick={() => setFocus(item)}
            className={
              focus === item
                ? 'rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#0F4C5C]'
                : 'rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-teal-100 hover:bg-white/20'
            }
          >
            {item === 'red' ? '红球' : item === 'green' ? '绿球' : '黄球'}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-teal-100">
          红球距离 {distance} cm
          <input
            type="range"
            min={4}
            max={35}
            value={distance}
            disabled={disabled}
            onChange={(event) => setDistance(Number(event.target.value))}
            className="w-40"
          />
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onComplete?.('pass', { accuracyRate: 1, clicks: 1, pops: 1 })
          }
          className="rounded-xl bg-teal-400 px-3 py-2 text-xs font-bold text-[#0B3946]"
        >
          完成一轮
        </button>
      </div>
    </div>
  );
}
