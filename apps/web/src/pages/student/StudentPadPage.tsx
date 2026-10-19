import { useCallback, useEffect, useState } from 'react';
import {
  Circle,
  Crosshair,
  Eye,
  LockKeyhole,
  Star,
  Timer,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/Header';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  sessionApi,
  studentApi,
  type StudentDetail,
} from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import { levelLabel } from '../../utils/format';
import { BubbleGame } from './BubbleGame';
import { BrockGame } from './BrockGame';
import { CalibrationGame } from './CalibrationGame';
import { EyeRestOverlay } from './EyeRestOverlay';
import { StarGame } from './StarGame';

type GameKey = 'bubble' | 'brock' | 'star' | 'calibration';

const GAMES: Array<{
  key: GameKey;
  label: string;
  icon: typeof Circle;
  hint: string;
}> = [
  { key: 'bubble', label: '泡泡追追看', icon: Circle, hint: '平滑追踪 · 眼-头分离' },
  { key: 'brock', label: '奇妙聚散球', icon: Eye, hint: '集合散开 · 生理复视' },
  { key: 'star', label: '森林找星星', icon: Star, hint: '图形背景 · 按序扫描' },
  { key: 'calibration', label: '眼动 5 点校准', icon: Crosshair, hint: '注视稳定性' },
];

const GAME_LABELS: Record<GameKey, string> = {
  bubble: '泡泡追追看',
  brock: '奇妙聚散球',
  star: '森林找星星',
  calibration: '眼动 5 点校准',
};

export function StudentPadPage() {
  const activeStudentId = useAppStore((state) => state.activeStudentId);
  const showToast = useAppStore((state) => state.showToast);
  const navigate = useNavigate();

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [game, setGame] = useState<GameKey>('bubble');
  const [remainingQuota, setRemainingQuota] = useState(900);
  const [elapsed, setElapsed] = useState(0);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [lastResult, setLastResult] = useState<'pass' | 'fail' | null>(null);

  const { emitPadTrialCompleted } = useWebSocket({
    role: 'student',
    studentId: activeStudentId,
    onSwitchPadTask: (payload) => {
      setGame(payload.gameMode);
      setRemainingQuota(payload.remainingEyeQuotaSec);
      showToast(`教师端已投屏切换：${GAME_LABELS[payload.gameMode]}`, 'info');
    },
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!activeStudentId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const detail = await studentApi.get(activeStudentId);
        if (cancelled) return;
        setStudent(detail);

        if (
          detail.triageStatus === 'RED_ZONE_LOCKED' ||
          detail.triageStatus === 'REFERRAL_UPLOADED'
        ) {
          setLocked(true);
          setLoading(false);
          return;
        }

        const sessions = await sessionApi.list(activeStudentId);
        const active = sessions.find((session) => !session.isFinished);
        const session =
          active ?? (await sessionApi.start({ studentId: activeStudentId }));
        if (cancelled) return;
        setSessionId(session.id);

        try {
          const quota = await sessionApi.digitalStart(session.id);
          setRemainingQuota(quota.remainingQuotaSec);
        } catch {
          setRemainingQuota(0);
          setOverlayOpen(true);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : String(err), 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeStudentId, showToast]);

  useEffect(() => {
    if (!sessionId || locked || overlayOpen) return;

    const secondTimer = setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);

    const syncTimer = setInterval(async () => {
      try {
        const response = await sessionApi.addDigital(sessionId, 15);
        setRemainingQuota(response.remainingQuotaSec);
        if (response.locked) {
          setOverlayOpen(true);
        }
      } catch {
        // 网络抖动时忽略本轮同步，下一轮继续。
      }
    }, 15000);

    return () => {
      clearInterval(secondTimer);
      clearInterval(syncTimer);
    };
  }, [sessionId, locked, overlayOpen]);

  const handleComplete = useCallback(
    async (
      result: 'pass' | 'fail',
      stats: { accuracyRate: number; clicks: number; pops: number },
    ) => {
      setLastResult(result);
      if (result === 'pass') {
        setStars((value) => value + 1);
      }

      if (!sessionId || !activeStudentId) return;

      try {
        await sessionApi.recordTrial(sessionId, {
          result,
          promptLevel: 1,
          material: GAME_LABELS[game],
          isDigital: true,
          digitalSeconds: 0,
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes('15 分钟')) {
          setOverlayOpen(true);
        }
      }

      emitPadTrialCompleted({
        event: 'PAD_TRIAL_COMPLETED',
        studentId: activeStudentId,
        gameMode: game,
        accuracyRate: stats.accuracyRate,
        avgReactionTimeMs: 1200,
        smoothPursuitGain: 0.85,
      });
    },
    [sessionId, activeStudentId, game, emitPadTrialCompleted],
  );

  const unlock = async (authorizedBy: string) => {
    if (!sessionId) {
      setOverlayOpen(false);
      return;
    }
    try {
      const response = await sessionApi.resetDigital(sessionId, authorizedBy);
      setRemainingQuota(response.remainingQuotaSec);
      setOverlayOpen(false);
      setElapsed(0);
      showToast('数字护眼额度已重置为 900 秒', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B3946]">
        <Header />
        <div className="flex h-[60vh] items-center justify-center text-sm text-teal-100">
          正在连接学生端…
        </div>
      </div>
    );
  }

  if (!activeStudentId) {
    return (
      <div className="min-h-screen bg-[#0B3946]">
        <Header />
        <div className="mx-auto mt-20 max-w-md rounded-2xl bg-white/10 p-8 text-center text-white">
          <h1 className="text-lg font-bold">请先选择学生</h1>
          <p className="mt-2 text-sm text-teal-100/80">
            在顶部「当前学生」下拉框选择一名学生后进入学生 Pad。
          </p>
        </div>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="min-h-screen bg-[#0B3946]">
        <Header />
        <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-rose-400/40 bg-rose-950/60 p-8 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20 text-rose-300">
            <LockKeyhole className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-xl font-bold">红区熔断保护已生效</h1>
          <p className="mt-2 text-sm text-rose-100/80">
            {student?.name} 存在屈光参差 / 斜视 / 视力异常等红区指征。
            未完成眼科专科处置与回执审核前，禁止启动高负荷数字视觉训练。
          </p>
          <button
            type="button"
            onClick={() => navigate('/web/assessment')}
            className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-bold text-rose-900"
          >
            前往评估中心处理转介
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B3946]">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-5 text-white">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 p-4">
          <div>
            <div className="text-lg font-bold">
              {student?.name}
              <span className="ml-2 text-xs font-normal text-teal-200">
                {student?.studentCode} · {levelLabel(student?.currentLevel ?? '')}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-teal-200/80">
              星星奖励：{stars} · 本次课已训练 {elapsed} 秒
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 rounded-xl bg-teal-400/15 px-3 py-2 text-teal-200">
              <Timer className="h-4 w-4" />
              数字额度 {remainingQuota}s
            </div>
            {lastResult && (
              <span
                className={
                  lastResult === 'pass'
                    ? 'rounded-xl bg-emerald-400/20 px-3 py-2 font-bold text-emerald-200'
                    : 'rounded-xl bg-rose-400/20 px-3 py-2 font-bold text-rose-200'
                }
              >
                上一轮：{lastResult === 'pass' ? '通过' : '未通过'}
              </span>
            )}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GAMES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setGame(item.key)}
                className={
                  game === item.key
                    ? 'rounded-2xl bg-white p-3 text-left text-[#0F4C5C] shadow-lg'
                    : 'rounded-2xl bg-white/5 p-3 text-left text-teal-100 hover:bg-white/10'
                }
              >
                <Icon className="h-5 w-5" />
                <div className="mt-1.5 text-sm font-bold">{item.label}</div>
                <div className={game === item.key ? 'text-[11px] text-slate-500' : 'text-[11px] text-teal-200/70'}>
                  {item.hint}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl bg-white/5 p-3">
          {game === 'bubble' && (
            <BubbleGame disabled={overlayOpen} onComplete={(result, stats) => void handleComplete(result, stats)} />
          )}
          {game === 'brock' && (
            <BrockGame disabled={overlayOpen} onComplete={(result, stats) => void handleComplete(result, stats)} />
          )}
          {game === 'star' && (
            <StarGame disabled={overlayOpen} onComplete={(result, stats) => void handleComplete(result, stats)} />
          )}
          {game === 'calibration' && (
            <CalibrationGame disabled={overlayOpen} onComplete={(result, stats) => void handleComplete(result, stats)} />
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-teal-200/60">
          本次课数字训练累计达到 900 秒后将强制全屏护眼休息，需教师授权或完成 20 秒远眺。
        </p>
      </main>

      <EyeRestOverlay
        open={overlayOpen}
        onUnlock={() => void unlock('周敏 (OT)')}
        onRestFinished={() => void unlock('休息结束自动解锁')}
      />
    </div>
  );
}
