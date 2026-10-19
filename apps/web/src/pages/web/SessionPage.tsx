import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Play,
  RefreshCw,
  ShieldAlert,
  Timer,
  XCircle,
} from 'lucide-react';
import type {
  PromotionCheckResult,
  SessionStage,
  TrialRecord,
} from '@vmi-tis/shared-types';
import {
  parseTrialRecords,
  sessionApi,
  type SessionDetail,
} from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { TrialBox } from '../../components/TrialBox';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAppStore } from '../../store/useAppStore';
import {
  formatDateTime,
  levelLabel,
  percent,
} from '../../utils/format';

const STAGE_LABELS: Record<number, string> = {
  1: '签到唤醒 3m',
  2: '复习联结 4m',
  3: '核心新任务 13m',
  4: '巩固泛化 9m',
  5: '强化结束 4m',
};

const PROMPT_LABELS: Record<number, string> = {
  1: '独立完成',
  2: '言语提示',
  3: '手势提示',
  4: '慢速示范',
  5: '手把手辅助',
};

export function SessionPage() {
  const activeStudentId = useAppStore((state) => state.activeStudentId);
  const showToast = useAppStore((state) => state.showToast);

  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [trials, setTrials] = useState<TrialRecord[]>([]);
  const [promptLevel, setPromptLevel] = useState(1);
  const [stage, setStage] = useState(1);
  const [accuracyRate, setAccuracyRate] = useState(0);
  const [digitalDurationSec, setDigitalDurationSec] = useState(0);
  const [remainingQuotaSec, setRemainingQuotaSec] = useState(900);
  const [isDigital, setIsDigital] = useState(false);
  const [digitalSeconds, setDigitalSeconds] = useState(30);
  const [promotion, setPromotion] = useState<PromotionCheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  const applySession = useCallback((detail: SessionDetail) => {
    setSession(detail);
    setTrials(parseTrialRecords(detail.trialsJson));
    setStage(detail.currentStage);
    setAccuracyRate(detail.accuracyRate);
    setDigitalDurationSec(detail.digitalDurationSec);
    setRemainingQuotaSec(Math.max(0, 900 - detail.digitalDurationSec));
  }, []);

  const loadSessions = useCallback(async () => {
    if (!activeStudentId) return;
    setLoading(true);
    try {
      const list = await sessionApi.list(activeStudentId);
      setSessions(list);
      if (session?.id) {
        const refreshed = await sessionApi.get(session.id);
        applySession(refreshed);
      } else {
        const active = list.find((item) => !item.isFinished);
        if (active) {
          applySession(await sessionApi.get(active.id));
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [activeStudentId, session?.id, applySession, showToast]);

  const { emitSwitchPadTask } = useWebSocket({
    role: 'therapist',
    studentId: activeStudentId,
    onPadTrialCompleted: (payload) => {
      if (payload.studentId !== activeStudentId) return;
      showToast(
        `学生 Pad 完成一轮：${payload.gameMode} · 正确率 ${percent(
          payload.accuracyRate,
        )}`,
        'info',
      );
      void loadSessions();
    },
  });

  useEffect(() => {
    setSession(null);
    setTrials([]);
    setPromotion(null);
    void loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudentId]);

  const switchPadTask = (
    gameMode: 'bubble' | 'brock' | 'star' | 'calibration',
  ) => {
    if (!activeStudentId) {
      showToast('请先在顶部选择学生', 'error');
      return;
    }
    emitSwitchPadTask({
      event: 'SWITCH_PAD_TASK',
      studentId: activeStudentId,
      gameMode,
      difficulty: {
        speed: 1,
        trajectory: 'sine',
        promptFade: 'slow',
      },
      remainingEyeQuotaSec: remainingQuotaSec,
    });
    showToast(`已投屏切换学生 Pad 游戏：${gameMode}`, 'success');
  };

  const startSession = async () => {
    if (!activeStudentId) {
      showToast('请先在顶部选择学生', 'error');
      return;
    }
    try {
      const created = await sessionApi.start({ studentId: activeStudentId });
      applySession(created);
      setPromotion(null);
      showToast(`已开始第 ${created.sessionNumber} 次课`, 'success');
      await loadSessions();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const recordTrial = useCallback(
    async (result: 'pass' | 'fail') => {
      if (!session || session.isFinished) {
        showToast('当前没有进行中的课次', 'error');
        return;
      }
      try {
        const payload = {
          result,
          promptLevel,
          material: session.sopCard?.cardTitle,
          ...(isDigital
            ? { isDigital: true, digitalSeconds: Math.max(0, digitalSeconds) }
            : {}),
        };
        const response = await sessionApi.recordTrial(session.id, payload);
        setTrials(parseTrialRecords(response.session.trialsJson));
        setAccuracyRate(response.accuracyRate);
        setDigitalDurationSec(response.digitalDurationSec);
        setRemainingQuotaSec(response.remainingQuotaSec);
        setSession((prev) =>
          prev
            ? {
                ...prev,
                trialsJson: response.session.trialsJson,
                accuracyRate: response.accuracyRate,
                digitalDurationSec: response.digitalDurationSec,
              }
            : prev,
        );
        if (isDigital && response.remainingQuotaSec <= 0) {
          showToast('数字训练已达 15 分钟上限，请切换实体操作卡', 'error');
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : String(err), 'error');
      }
    },
    [
      session,
      promptLevel,
      isDigital,
      digitalSeconds,
      showToast,
    ],
  );

  const changeStage = useCallback(
    async (nextStage: number) => {
      if (!session) return;
      try {
        await sessionApi.updateStage(session.id, nextStage);
        setStage(nextStage);
        showToast(`已切换至第 ${nextStage} 环节`, 'info');
      } catch (err) {
        showToast(err instanceof Error ? err.message : String(err), 'error');
      }
    },
    [session, showToast],
  );

  const nextStage = useCallback(() => {
    void changeStage(stage < 5 ? stage + 1 : 1);
  }, [changeStage, stage]);

  const adjustPrompt = useCallback((direction: 'up' | 'down') => {
    setPromptLevel((value) =>
      direction === 'up'
        ? Math.max(1, value - 1)
        : Math.min(5, value + 1),
    );
  }, []);

  useKeyboardShortcuts({
    enabled: Boolean(session && !session.isFinished),
    onCorrect: () => void recordTrial('pass'),
    onIncorrect: () => void recordTrial('fail'),
    onAdjustPrompt: adjustPrompt,
    onNextStage: nextStage,
  });

  const finishSession = async () => {
    if (!session) return;
    try {
      const response = await sessionApi.finish(session.id, {
        therapistNotes: '课堂记录台结课',
      });
      setPromotion(response.promotion);
      applySession({ ...session, ...response.session });
      showToast('本次课已结课', 'success');
      await loadSessions();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const addDigitalTime = async () => {
    if (!session) return;
    try {
      const response = await sessionApi.addDigital(
        session.id,
        Math.max(0, digitalSeconds),
      );
      setDigitalDurationSec(response.digitalDurationSec);
      setRemainingQuotaSec(response.remainingQuotaSec);
      if (response.locked) {
        showToast('数字训练已达 15 分钟上限', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const trialBoxes = useMemo(() => {
    return Array.from({ length: 10 }, (_, index) => ({
      index: index + 1,
      result: trials[index]?.result ?? null,
    }));
  }, [trials]);

  const passCount = trials.filter((trial) => trial.result === 'pass').length;

  return (
    <div>
      <PageHeader
        title="课堂记分台"
        description="五段式课堂、10 回合记分、盲操快捷键与 15 分钟数字护眼锁"
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => void loadSessions()}>
              <RefreshCw className="mr-1 inline h-4 w-4" />
              刷新
            </button>
            <button type="button" className="btn-primary" onClick={() => void startSession()}>
              <Play className="mr-1 inline h-4 w-4" />
              开始新课堂
            </button>
          </>
        }
      />

      {!session && (
        <div className="card mb-4 p-8 text-center">
          <div className="text-sm font-semibold text-slate-700">当前没有进行中的课次</div>
          <p className="mt-1 text-xs text-slate-500">
            点击「开始新课堂」创建一节课；已有进行中的课次会自动恢复。
          </p>
        </div>
      )}

      {session && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="card xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
              <div>
                <div className="text-sm font-bold text-slate-800">
                  第 {session.sessionNumber} 次课 · {session.student?.name}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {session.sopCard?.cardCode} {session.sopCard?.cardTitle} ·{' '}
                  {levelLabel(session.student?.currentLevel ?? '')}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="badge bg-teal-100 text-teal-800">
                  正确率 {percent(accuracyRate)}
                </span>
                <span className="badge bg-slate-100 text-slate-700">
                  {passCount}/{trials.length} 通过
                </span>
                {session.isFinished && (
                  <span className="badge bg-emerald-100 text-emerald-800">已结课</span>
                )}
              </div>
            </div>

            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-600">
                  Trial 记分（10 回合）
                </div>
                <div className="text-[11px] text-slate-400">
                  空格 / 1 记成功 · 0 记失败 · ↑↓ 调提示 · N 下一环节
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {trialBoxes.map((box) => (
                  <TrialBox
                    key={box.index}
                    index={box.index}
                    result={box.result}
                    active={box.index === trials.length + 1 && !session.isFinished}
                  />
                ))}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={session.isFinished}
                  onClick={() => void recordTrial('pass')}
                  className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 px-4 py-5 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
                >
                  <CheckCircle2 className="mx-auto mb-1 h-5 w-5" />
                  记录成功（Space/1）
                </button>
                <button
                  type="button"
                  disabled={session.isFinished}
                  onClick={() => void recordTrial('fail')}
                  className="rounded-2xl border-2 border-rose-300 bg-white px-4 py-5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                >
                  <XCircle className="mx-auto mb-1 h-5 w-5" />
                  记录失败（0）
                </button>
                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                  提示层级
                  <select
                    value={promptLevel}
                    onChange={(event) => setPromptLevel(Number(event.target.value))}
                    className="input mt-1"
                  >
                    {Object.entries(PROMPT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {value} · {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <label className="flex items-center gap-2 font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={isDigital}
                      onChange={(event) => setIsDigital(event.target.checked)}
                    />
                    本回合为数字训练
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">本回合秒数</span>
                    <input
                      type="number"
                      min={0}
                      max={900}
                      value={digitalSeconds}
                      onChange={(event) => setDigitalSeconds(Number(event.target.value))}
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    />
                    <button type="button" className="btn-secondary text-xs" onClick={() => void addDigitalTime()}>
                      <Timer className="mr-1 inline h-3.5 w-3.5" />
                      同步时长
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                  <span>累计数字时间：{digitalDurationSec} 秒</span>
                  <span
                    className={
                      remainingQuotaSec <= 0
                        ? 'font-bold text-rose-600'
                        : 'font-semibold text-teal-700'
                    }
                  >
                    剩余额度：{remainingQuotaSec} 秒
                  </span>
                </div>
                {remainingQuotaSec <= 0 && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-rose-50 p-2 text-xs font-semibold text-rose-800">
                    <ShieldAlert className="h-4 w-4" />
                    本次课数字训练已达 15 分钟上限，请切换至实体操作卡训练
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button" className="btn-primary" disabled={session.isFinished} onClick={() => void finishSession()}>
                  结课并检查晋级
                </button>
              </div>

              {promotion && (
                <div
                  className={
                    promotion.canPromote
                      ? 'mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900'
                      : 'mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900'
                  }
                >
                  <div className="font-bold">
                    {promotion.canPromote ? '已触发晋级待办' : '暂未满足晋级条件'}
                  </div>
                  <div className="mt-1">
                    最近 3 次课正确率：
                    {promotion.recentSessions
                      .map((item) => percent(item.accuracyRate))
                      .join(' / ') || '—'}
                    · 材料 {promotion.materialCount} 种 · 打卡{' '}
                    {promotion.homeCheckinCount} 次
                  </div>
                  {promotion.reason && <div className="mt-1">{promotion.reason}</div>}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="card p-4">
              <h3 className="text-sm font-bold text-slate-800">五段式环节</h3>
              <div className="mt-3 space-y-2">
                {Object.entries(STAGE_LABELS).map(([value, label]) => {
                  const stageNumber = Number(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => void changeStage(stageNumber)}
                      className={
                        stage === stageNumber
                          ? 'flex w-full items-center justify-between rounded-xl bg-[#0F4C5C] px-3 py-2.5 text-left text-xs font-semibold text-white'
                          : 'flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-50'
                      }
                    >
                      <span>
                        {value}. {label}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card p-4">
              <h3 className="text-sm font-bold text-slate-800">投屏到学生 Pad</h3>
              <p className="mt-1 text-[11px] text-slate-400">
                教师端切换任务，Pad 通过 WebSocket 实时收到。
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  ['bubble', '泡泡追追看'],
                  ['brock', '奇妙聚散球'],
                  ['star', '森林找星星'],
                  ['calibration', '5 点校准'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      switchPadTask(
                        key as 'bubble' | 'brock' | 'star' | 'calibration',
                      )
                    }
                    className="rounded-xl bg-slate-100 px-2 py-2 text-[11px] font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-800"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-4 text-xs text-slate-600">
              <h3 className="text-sm font-bold text-slate-800">本次课信息</h3>
              <div className="mt-2 space-y-1">
                <div>开始时间：{formatDateTime(session.sessionDate)}</div>
                <div>操作卡：{session.sopCard?.cardTitle ?? '—'}</div>
                <div>状态：{session.isFinished ? '已结课' : '进行中'}</div>
                <div>当前环节：第 {stage} 段 · {STAGE_LABELS[stage]}</div>
              </div>
            </div>

            <div className="card p-4">
              <h3 className="text-sm font-bold text-slate-800">历史课次</h3>
              <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                {sessions.length === 0 && (
                  <p className="text-xs text-slate-400">暂无历史课次</p>
                )}
                {sessions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={async () => {
                      const detail = await sessionApi.get(item.id);
                      applySession(detail);
                      setPromotion(null);
                    }}
                    className={
                      session.id === item.id
                        ? 'w-full rounded-xl bg-teal-50 p-2.5 text-left text-xs ring-1 ring-teal-300'
                        : 'w-full rounded-xl border border-slate-200 p-2.5 text-left text-xs hover:bg-slate-50'
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">
                        第 {item.sessionNumber} 次 · {item.student?.name}
                      </span>
                      <span className={item.isFinished ? 'text-emerald-700' : 'text-amber-700'}>
                        {item.isFinished ? percent(item.accuracyRate) : '进行中'}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {formatDateTime(item.sessionDate)} · {item.sopCard?.cardCode}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {loading && !session && (
        <div className="card p-8 text-center text-sm text-slate-400">加载课次…</div>
      )}
    </div>
  );
}
