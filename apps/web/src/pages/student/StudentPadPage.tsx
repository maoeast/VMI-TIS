import { useCallback, useEffect, useState } from 'react';
import type { AssessmentCardChangePayload } from '@vmi-tis/shared-types';
import {
  Circle,
  ClipboardCheck,
  Crosshair,
  Eye,
  LockKeyhole,
  MonitorUp,
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
import { TERMINAL_MODE, useAppStore } from '../../store/useAppStore';
import { levelLabel } from '../../utils/format';
import { AssessmentCardPanel } from '../../components/assessment/AssessmentCardPanel';
import { BeeryVmiCard } from '../../components/assessment/BeeryVmiCard';
import { DemMatrix } from '../../components/assessment/DemMatrix';
import { Tvps4Card } from '../../components/assessment/Tvps4Card';
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

/**
 * 学生端只读渲染教师端出示的评估卡：只吃种子索引（题号 / 子测验 / 阶段 / 矩阵），
 * 不伪造题库、不本地翻题、不自行推进 TVPS 阶段；选项可点选但只在本机高亮。
 */
function RemoteAssessmentCard({ card }: { card: AssessmentCardChangePayload }) {
  if (card.cardType === 'beery') {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#0F4C5C]">
          <MonitorUp className="h-4 w-4" />
          Beery VMI-6 · 第 {card.beeryItemNumber ?? 1} 题
        </div>
        <BeeryVmiCard itemNumber={card.beeryItemNumber ?? 1} readOnly />
      </div>
    );
  }

  if (card.cardType === 'tvps4') {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#0F4C5C]">
          <MonitorUp className="h-4 w-4" />
          TVPS-4 样例题卡 · 呈现与切题由教师端控制
        </div>
        <Tvps4Card
          readOnly
          revealAnswer={false}
          subtestCode={card.tvpsSubtestCode ?? ''}
          itemIndex={card.tvpsItemIndex ?? 0}
          phase={card.tvpsPhase ?? 'options'}
          remaining={card.tvpsRemaining ?? 0}
        />
      </div>
    );
  }

  if (card.cardType === 'dem') {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#0F4C5C]">
          <MonitorUp className="h-4 w-4" />
          DEM 数字矩阵 · Test {card.demTest ?? 'A'}
        </div>
        <DemMatrix readOnly test={card.demTest ?? 'A'} />
      </div>
    );
  }

  return <p className="text-xs text-slate-400">教师端未指定题卡类型。</p>;
}

export function StudentPadPage() {
  const activeStudentId = useAppStore((state) => state.activeStudentId);
  const setActiveStudent = useAppStore((state) => state.setActiveStudent);
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
  const [mode, setMode] = useState<'training' | 'assessment'>('training');
  /** 教师端经 `ASSESSMENT_CARD_CHANGE` 推到本机的评估卡；null 时显示本机出示面板。 */
  const [assessmentCard, setAssessmentCard] =
    useState<AssessmentCardChangePayload | null>(null);

  const { emitPadTrialCompleted } = useWebSocket({
    role: 'student',
    studentId: activeStudentId,
    // 教师端选学生后广播到 role:student；本窗口跟随并把当前学生写回 store，
    // hook 以新 studentId 重连，下面的 effect 负责清空旧状态并重载新学生。
    onSwitchStudent: (payload) => {
      setActiveStudent(payload.studentId);
    },
    // 评估双屏：只看发给本机当前学生的卡；收回即退出评估画面恢复训练。
    // 学生端不自行改题/阶段，也不因收到未知 studentId 的卡而跳转。
    onAssessmentCardChange: (payload) => {
      if (!activeStudentId || payload.studentId !== activeStudentId) return;
      if (payload.action === 'hide' || !payload.cardType) {
        setAssessmentCard(null);
        setMode('training');
        return;
      }
      setAssessmentCard(payload);
      setMode('assessment');
    },
    onSwitchPadTask: (payload) => {
      setGame(payload.gameMode);
      setRemainingQuota(payload.remainingEyeQuotaSec);
      // 新投屏任务优先：收起评估卡并回到训练画面。
      setAssessmentCard(null);
      setMode('training');
      showToast(`教师端已投屏切换：${GAME_LABELS[payload.gameMode]}`, 'info');
    },
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // 切换学生时先清空上一名学生的锁定/课次/游戏状态。
      setLocked(false);
      setOverlayOpen(false);
      setSessionId(null);
      setStudent(null);
      setElapsed(0);
      setStars(0);
      setLastResult(null);
      setMode('training');
      setAssessmentCard(null);

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
    if (mode !== 'training' || !sessionId || locked || overlayOpen) return;

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
  }, [mode, sessionId, locked, overlayOpen]);

  const handleComplete = useCallback(
    async (
      result: 'pass' | 'fail',
      stats: { accuracyRate: number; clicks: number; pops: number },
    ) => {
      if (mode !== 'training') return;
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
    [sessionId, activeStudentId, game, emitPadTrialCompleted, mode],
  );

  const unlock = async (authorizationCode: string) => {
    if (!sessionId) {
      setOverlayOpen(false);
      return;
    }
    try {
      const response = await sessionApi.resetDigital(
        sessionId,
        authorizationCode,
      );
      setRemainingQuota(response.remainingQuotaSec);
      setOverlayOpen(false);
      setElapsed(0);
      showToast('数字护眼额度已重置为 900 秒', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const handleTeacherUnlock = () => {
    const code = window.prompt('请输入教师授权码');
    if (code) void unlock(code.trim());
  };

  const handleRestFinished = () => {
    // 20 秒远眺只关闭遮罩，不重置本课累计额度：
    // 下一次数字训练仍会被 403 拦截，必须由教师授权码重置。
    setOverlayOpen(false);
    showToast('已完成远眺休息；本课数字额度需教师授权码重置', 'info');
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
          {TERMINAL_MODE === 'all' ? (
            <button
              type="button"
              onClick={() => navigate('/web/assessment')}
              className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-bold text-rose-900"
            >
              前往评估中心处理转介
            </button>
          ) : (
            <p className="mt-6 text-xs text-rose-100">
              请让老师在教师端处理转介并上传回执；处理完成后重新进入。
            </p>
          )}
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
            <button
              type="button"
              onClick={() => {
                if (mode === 'training') {
                  // 本机出示优先（与远程卡 last-write-wins）：清掉远程卡回本机面板。
                  setAssessmentCard(null);
                  setMode('assessment');
                  return;
                }
                setMode('training');
              }}
              className="flex items-center gap-1.5 rounded-xl bg-teal-400/15 px-3 py-2 text-teal-200"
            >
              <ClipboardCheck className="h-4 w-4" />
              {mode === 'training' ? '评估出示' : '返回训练'}
            </button>
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

        {mode === 'assessment' ? (
          <div className="rounded-2xl bg-white p-4 text-slate-800">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-800">
                  {assessmentCard ? '教师端出示的评估题卡' : '评估题卡出示'}
                </h2>
                <p className="text-xs text-slate-500">
                  {assessmentCard
                    ? '题卡由教师端控制；本机不计数字额度、不记录 Trial、不改投屏模式。'
                    : '仅出示 Beery / TVPS-4 / DEM 题卡；不计数字额度、不记录 Trial、不改投屏模式。'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {assessmentCard && (
                  <button
                    type="button"
                    className="btn-secondary inline-flex items-center gap-1"
                    onClick={() => setAssessmentCard(null)}
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    改用本机出示
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setMode('training');
                    setAssessmentCard(null);
                  }}
                >
                  返回训练
                </button>
              </div>
            </div>
            {assessmentCard ? (
              <RemoteAssessmentCard card={assessmentCard} />
            ) : (
              <AssessmentCardPanel revealAnswer={false} />
            )}
          </div>
        ) : (
          <>
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
              本次课数字训练累计达到 900 秒后将强制全屏护眼休息；20 秒远眺只关闭遮罩，重置额度需教师授权码。
            </p>
          </>
        )}
      </main>

      <EyeRestOverlay
        open={overlayOpen}
        onUnlock={handleTeacherUnlock}
        onRestFinished={handleRestFinished}
      />
    </div>
  );
}
