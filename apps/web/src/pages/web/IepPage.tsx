import { useEffect, useState } from 'react';
import {
  CalendarRange,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type {
  CapabilityLevel,
  IepPlan,
  PromotionCheckResult,
  SopCard,
} from '@vmi-tis/shared-types';
import { iepApi, parseJson, sopCardApi } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { useAppStore } from '../../store/useAppStore';
import {
  formatDate,
  levelLabel,
  percent,
} from '../../utils/format';

const DEFAULT_SCHEDULE = JSON.stringify(
  { Mon: ['09:00'], Wed: ['14:00'], Fri: ['09:00'] },
  null,
  2,
);

export function IepPage() {
  const activeStudentId = useAppStore((state) => state.activeStudentId);
  const iepDraftCards = useAppStore((state) => state.iepDraftCards);
  const clearIepDraftCards = useAppStore((state) => state.clearIepDraftCards);
  const showToast = useAppStore((state) => state.showToast);

  const [plans, setPlans] = useState<IepPlan[]>([]);
  const [cards, setCards] = useState<SopCard[]>([]);
  const [promotion, setPromotion] = useState<PromotionCheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  const [targetLevel, setTargetLevel] = useState('L2');
  const [weeklyFrequency, setWeeklyFrequency] = useState(3);
  const [sessionMinutes, setSessionMinutes] = useState(35);
  const [digitalLimitMin, setDigitalLimitMin] = useState(15);
  const [homeworkFrequency, setHomeworkFrequency] = useState(5);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState(DEFAULT_SCHEDULE);

  const load = async () => {
    if (!activeStudentId) return;
    setLoading(true);
    try {
      const [planList, cardList] = await Promise.all([
        iepApi.list(activeStudentId),
        sopCardApi.list(),
      ]);
      setPlans(planList);
      setCards(cardList);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudentId]);

  useEffect(() => {
    if (iepDraftCards.length === 0) return;
    setSelectedCards((prev) =>
      Array.from(new Set([...prev, ...iepDraftCards])),
    );
  }, [iepDraftCards]);

  const toggleCard = (cardCode: string) => {
    setSelectedCards((prev) =>
      prev.includes(cardCode)
        ? prev.filter((code) => code !== cardCode)
        : [...prev, cardCode],
    );
  };

  const createPlan = async () => {
    if (!activeStudentId) {
      showToast('请先在顶部选择学生', 'error');
      return;
    }
    if (selectedCards.length === 0) {
      showToast('请至少选择一张操作卡', 'error');
      return;
    }

    let schedule: Record<string, string[]>;
    try {
      schedule = JSON.parse(weeklySchedule) as Record<string, string[]>;
    } catch {
      showToast('周课表不是合法 JSON', 'error');
      return;
    }

    try {
      await iepApi.create({
        studentId: activeStudentId,
        targetLevel: targetLevel as CapabilityLevel,
        weeklyFrequency,
        sessionMinutes,
        digitalLimitMin,
        selectedCards,
        weeklySchedule: schedule,
        homeworkFrequency,
      });
      clearIepDraftCards();
      setSelectedCards([]);
      showToast('IEP 计划已创建', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const approvePlan = async (plan: IepPlan) => {
    try {
      await iepApi.approve(plan.id, '周敏 (OT)');
      showToast('IEP 已审核确认', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const checkPromotion = async () => {
    if (!activeStudentId) return;
    try {
      const result = await iepApi.checkPromotion(activeStudentId);
      setPromotion(result);
      showToast(
        result.canPromote ? '满足晋级条件，可提交审批' : result.reason ?? '暂未满足晋级条件',
        result.canPromote ? 'success' : 'info',
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const approvePromotion = async () => {
    if (!activeStudentId) return;
    try {
      const student = await iepApi.approvePromotion(activeStudentId, '周敏 (OT)');
      showToast(`晋级已批准，当前层级 ${student.currentLevel}`, 'success');
      setPromotion(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="IEP 计划与晋级审批"
        description="个别化训练计划、周课表、跨材料晋级复核"
        actions={
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            <RefreshCw className="mr-1 inline h-4 w-4" />
            刷新
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <section className="card p-5 xl:col-span-2">
          <h2 className="text-sm font-bold text-slate-800">新建 IEP</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-600">
              目标层级
              <select value={targetLevel} onChange={(event) => setTargetLevel(event.target.value)} className="input mt-1">
                {['L0', 'L1', 'L2', 'L3', 'L4', 'L5'].map((level) => (
                  <option key={level} value={level}>{levelLabel(level)}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">
              每周频次
              <input type="number" min={1} max={7} value={weeklyFrequency} onChange={(event) => setWeeklyFrequency(Number(event.target.value))} className="input mt-1" />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              单次时长（分钟）
              <input type="number" min={10} max={120} value={sessionMinutes} onChange={(event) => setSessionMinutes(Number(event.target.value))} className="input mt-1" />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              数字训练上限（分钟）
              <input type="number" min={0} max={15} value={digitalLimitMin} onChange={(event) => setDigitalLimitMin(Number(event.target.value))} className="input mt-1" />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              每周家庭作业（天）
              <input type="number" min={0} max={7} value={homeworkFrequency} onChange={(event) => setHomeworkFrequency(Number(event.target.value))} className="input mt-1" />
            </label>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>选择操作卡（{selectedCards.length} 张）</span>
              {iepDraftCards.length > 0 && (
                <span className="text-[11px] font-normal text-teal-700">
                  已从操作卡库带入 {iepDraftCards.length} 张
                </span>
              )}
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
              {cards.map((card) => (
                <label key={card.id} className="flex cursor-pointer items-start gap-2 rounded-lg p-1.5 text-xs hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedCards.includes(card.cardCode)}
                    onChange={() => toggleCard(card.cardCode)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-mono font-semibold text-slate-700">{card.cardCode}</span>
                    <span className="ml-2 text-slate-600">{card.cardTitle}</span>
                    <span className="block text-[11px] text-slate-400">{levelLabel(card.cardLevel)}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="mt-4 block text-xs font-semibold text-slate-600">
            周课表（JSON）
            <textarea
              value={weeklySchedule}
              onChange={(event) => setWeeklySchedule(event.target.value)}
              className="input mt-1 min-h-28 font-mono text-xs"
            />
          </label>

          <button type="button" className="btn-primary mt-4 w-full" onClick={() => void createPlan()}>
            <CalendarRange className="mr-1 inline h-4 w-4" />
            创建 IEP 计划
          </button>
        </section>

        <section className="space-y-4 xl:col-span-3">
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-800">晋级复核</h2>
                <p className="mt-1 text-xs text-slate-500">
                  连续 3 次课 ≥80% + 至少 2 种材料 + 至少 1 次家庭打卡
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary" onClick={() => void checkPromotion()}>
                  <Sparkles className="mr-1 inline h-4 w-4" />
                  检查晋级条件
                </button>
                <button type="button" className="btn-primary" disabled={!promotion?.canPromote} onClick={() => void approvePromotion()}>
                  <CheckCircle2 className="mr-1 inline h-4 w-4" />
                  审批晋级
                </button>
              </div>
            </div>
            {promotion && (
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-4">
                <div>
                  <div className="text-slate-400">可晋级</div>
                  <div className="font-bold">{promotion.canPromote ? '是' : '否'}</div>
                </div>
                <div>
                  <div className="text-slate-400">材料数</div>
                  <div className="font-bold">{promotion.materialCount}</div>
                </div>
                <div>
                  <div className="text-slate-400">家庭打卡</div>
                  <div className="font-bold">{promotion.homeCheckinCount}</div>
                </div>
                <div>
                  <div className="text-slate-400">最近正确率</div>
                  <div className="font-bold">
                    {promotion.recentSessions.map((item) => percent(item.accuracyRate)).join(' / ') || '—'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {loading && <div className="card p-5 text-sm text-slate-400">加载中…</div>}
            {!loading && plans.length === 0 && (
              <div className="card p-8 text-center text-sm text-slate-400">
                当前学生还没有 IEP 计划
              </div>
            )}
            {plans.map((plan) => {
              const selected = parseJson<string[]>(plan.selectedCardsJson, []);
              const schedule = parseJson<Record<string, string[]>>(
                plan.weeklyScheduleJson,
                {},
              );
              return (
                <div key={plan.id} className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="badge bg-teal-100 text-teal-800">
                        {levelLabel(plan.targetLevel)}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">
                        第 {plan.planPhase} 阶段 · {plan.status}
                      </span>
                    </div>
                    <button type="button" className="btn-secondary text-xs" onClick={() => void approvePlan(plan)}>
                      {plan.approvedBy ? `已审核：${plan.approvedBy}` : '审核确认'}
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    每周 {plan.weeklyFrequency} 次 · {plan.sessionMinutes} 分钟 · 数字上限{' '}
                    {plan.digitalLimitMin} 分钟 · 家庭作业 {plan.homeworkFrequency} 天
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selected.map((code) => (
                      <span key={code} className="badge bg-slate-100 font-mono text-slate-700">
                        {code}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    {Object.entries(schedule).map(([day, times]) => (
                      <span key={day} className="rounded-lg bg-slate-50 px-2 py-1">
                        {day}：{times.join('、')}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    创建于 {formatDate(plan.createdAt)}
                    {plan.approvedAt ? ` · 审核于 ${formatDate(plan.approvedAt)}` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
