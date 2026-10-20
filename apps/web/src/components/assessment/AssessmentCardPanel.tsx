import { useState } from 'react';
import { BeeryVmiCard } from './BeeryVmiCard';
import { DemMatrix } from './DemMatrix';
import { Tvps4Card } from './Tvps4Card';

type CardTab = 'beery' | 'tvps4' | 'dem';

const TABS: Array<{ key: CardTab; label: string }> = [
  { key: 'beery', label: 'Beery VMI-6' },
  { key: 'tvps4', label: 'TVPS-4' },
  { key: 'dem', label: 'DEM 数字矩阵' },
];

export function AssessmentCardPanel({
  revealAnswer = true,
}: {
  revealAnswer?: boolean;
}) {
  const [tab, setTab] = useState<CardTab>('beery');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={
              tab === entry.key
                ? 'rounded-xl bg-[#0F4C5C] px-4 py-2 text-xs font-bold text-white'
                : 'rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50'
            }
          >
            {entry.label}
          </button>
        ))}
      </div>
      {tab === 'beery' && <BeeryVmiCard />}
      {tab === 'tvps4' && <Tvps4Card revealAnswer={revealAnswer} />}
      {tab === 'dem' && <DemMatrix />}
    </div>
  );
}
