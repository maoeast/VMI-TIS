import { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  RefreshCw,
  Search,
  Volume2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SopCard } from '@vmi-tis/shared-types';
import { parseJson, sopCardApi } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { useAppStore } from '../../store/useAppStore';
import { levelLabel } from '../../utils/format';

const GAME_LABELS: Record<string, string> = {
  bubble: '戳泡泡',
  brock: '聚散球',
  star: '找星星',
};

export function LibraryPage() {
  const showToast = useAppStore((state) => state.showToast);
  const addIepCard = useAppStore((state) => state.addIepCard);
  const navigate = useNavigate();

  const [cards, setCards] = useState<SopCard[]>([]);
  const [level, setLevel] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setCards(await sopCardApi.list({ level, keyword }));
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const speak = (card: SopCard) => {
    const cues = parseJson<string[]>(card.cueTextJson, []);
    const text = cues[0] ?? card.cardTitle;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
    showToast(`正在朗读：${text}`, 'info');
  };

  const addToIep = (card: SopCard) => {
    addIepCard(card.cardCode);
    showToast(`已将 ${card.cardCode} 加入 IEP 草稿`, 'success');
    navigate('/web/iep');
  };

  return (
    <div>
      <PageHeader
        title="13 张标准化操作卡"
        description="M1–M5 模块分层、教具清单、操作步骤、通过标准与指导语"
        actions={
          <button type="button" className="btn-secondary" onClick={() => void load()}>
            <RefreshCw className="mr-1 inline h-4 w-4" />
            刷新
          </button>
        }
      />

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <label className="text-xs font-semibold text-slate-600">
          层级
          <select value={level} onChange={(event) => setLevel(event.target.value)} className="input mt-1 w-44">
            <option value="">全部层级</option>
            {['L0', 'L1', 'L2', 'L3', 'L5'].map((item) => (
              <option key={item} value={item}>{levelLabel(item)}</option>
            ))}
          </select>
        </label>
        <label className="min-w-64 flex-1 text-xs font-semibold text-slate-600">
          搜索
          <div className="mt-1 flex gap-2">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void load();
              }}
              placeholder="编码 / 标题 / 目标技能"
              className="input"
            />
            <button type="button" className="btn-primary" onClick={() => void load()}>
              <Search className="h-4 w-4" />
            </button>
          </div>
        </label>
      </div>

      {loading && <div className="card p-8 text-center text-sm text-slate-400">加载操作卡…</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {cards.map((card) => {
          const materials = parseJson<string[]>(card.materialsJson, []);
          const steps = parseJson<string[]>(card.procedureStepsJson, []);
          const cues = parseJson<string[]>(card.cueTextJson, []);
          return (
            <article key={card.id} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-[#0F4C5C] px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                      {card.cardCode}
                    </span>
                    <span className="badge bg-teal-50 text-teal-800">
                      {levelLabel(card.cardLevel)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-sm font-bold text-slate-800">
                    {card.cardTitle}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">{card.moduleName}</p>
                </div>
                {card.digitalGameMode && (
                  <span className="badge bg-sky-100 text-sky-800">
                    {GAME_LABELS[card.digitalGameMode] ?? card.digitalGameMode}
                  </span>
                )}
              </div>

              <div className="mt-3 text-xs">
                <span className="font-semibold text-slate-600">目标技能：</span>
                <span className="text-slate-600">{card.targetSkill}</span>
              </div>

              <div className="mt-2 rounded-xl bg-sky-50 p-2.5 text-xs text-sky-900">
                <span className="font-semibold">配套教具：</span>
                {materials.join('、') || '—'}
              </div>

              <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700">
                <div className="font-semibold">操作步骤</div>
                <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                  {steps.slice(0, 4).map((step, index) => (
                    <li key={`${card.id}-step-${index}`}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="mt-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900">
                <span className="font-semibold">通过标准：</span>
                {card.passCriteria}
              </div>

              <div className="mt-2 rounded-xl border border-teal-200 bg-white p-2.5 text-xs text-teal-900">
                <span className="font-semibold">标准指导语：</span>
                {cues[0] ?? '—'}
              </div>

              <div className="mt-3 flex gap-2">
                <button type="button" className="btn-secondary flex-1 text-xs" onClick={() => speak(card)}>
                  <Volume2 className="mr-1 inline h-3.5 w-3.5" />
                  听指导语
                </button>
                <button type="button" className="btn-primary flex-1 text-xs" onClick={() => addToIep(card)}>
                  <Plus className="mr-1 inline h-3.5 w-3.5" />
                  加入 IEP
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && cards.length === 0 && (
        <div className="card mt-4 p-10 text-center text-sm text-slate-400">
          <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          没有匹配的操作卡
        </div>
      )}
    </div>
  );
}
