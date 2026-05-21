'use client';

import type { AcademyModule, AcademyProgressSummary } from '@/lib/api';

interface Props {
  modules: AcademyModule[];
  activeLessonId: string | null;
  onLessonSelect: (lessonId: string) => void;
  progress: AcademyProgressSummary | null;
}

export default function ModuleSidebar({
  modules,
  activeLessonId,
  onLessonSelect,
  progress,
}: Props) {
  const completedIds = new Set(
    progress?.lessons.map((l) => l.lesson_id) ?? [],
  );
  const moduleProgress = new Map(
    progress?.modules.map((m) => [m.module_id, m]) ?? [],
  );

  return (
    <nav className="space-y-4">
      {modules.map((mod) => {
        const mp = moduleProgress.get(mod.id);
        const isLocked = mod.locked;
        return (
          <div
            key={mod.id}
            className={`rounded-xl border ${
              isLocked
                ? 'border-[#a78bfa]/20 bg-[#1a1a2e]/40'
                : 'border-[#26314a] bg-[#161629]'
            } overflow-hidden`}
          >
            <div className="px-4 py-3 border-b border-[#26314a]">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-mono text-gray-500">{mod.id}</span>
                {isLocked ? (
                  <span className="text-[10px] uppercase tracking-wider text-[#a78bfa]">
                    🔒 Premium
                  </span>
                ) : mp ? (
                  <span className="text-[10px] uppercase tracking-wider text-[#26de81]">
                    {mp.completed}/{mp.total}
                  </span>
                ) : null}
              </div>
              <h3 className="text-sm font-semibold text-white leading-tight">
                {mod.title}
              </h3>
              {mod.tagline && (
                <p className="text-[11px] text-gray-400 italic mt-1">{mod.tagline}</p>
              )}
            </div>
            <ul className="divide-y divide-[#26314a]/60">
              {mod.lessons.map((les) => {
                const isActive = activeLessonId === les.id;
                const isDone = completedIds.has(les.id);
                return (
                  <li key={les.id}>
                    <button
                      type="button"
                      onClick={() => onLessonSelect(les.id)}
                      className={`w-full text-left px-4 py-2.5 text-xs flex items-start gap-2 transition-colors ${
                        isActive
                          ? 'bg-[#4fc3f7]/10 text-white'
                          : 'text-gray-300 hover:bg-[#26314a]/40'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border text-[9px] flex items-center justify-center font-mono ${
                          isDone
                            ? 'border-[#26de81] bg-[#26de81] text-[#0e0e1a]'
                            : les.locked
                            ? 'border-[#a78bfa]/40 text-[#a78bfa]'
                            : 'border-gray-500 text-gray-500'
                        }`}
                      >
                        {isDone ? '✓' : les.locked ? '🔒' : ''}
                      </span>
                      <span className="flex-1">
                        <span className="font-mono text-gray-500 mr-1">{les.id}</span>
                        {les.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
