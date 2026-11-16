import React, { useCallback, useEffect, useState } from 'react';
import { Bookmark, CheckCircle2, Play, RotateCcw, Trash2 } from 'lucide-react';
import type { ExamQuestion, ExamSettings, MistakeCategory, MistakeRecord } from '../../shared/types.ts';
import { useArcade } from '../context/ArcadeContext.tsx';
import { readOfflineCache, updateOfflineCache } from '../utils/storageMigration.ts';
import { formatAnswerLabel } from '../components/quiz/SmartExplanationCard.tsx';

interface MistakesPageProps {
  onStartRevision: (questionIds: string[], settings?: Partial<ExamSettings>) => void;
}

const MISTAKE_TYPES: Array<{ id: MistakeCategory; label: string }> = [
  { id: 'concept', label: 'Concept Gap' },
  { id: 'calculation', label: 'Calculation Error' },
  { id: 'formula', label: 'Formula Error' },
  { id: 'careless', label: 'Careless Mistake' },
  { id: 'time-pressure', label: 'Time Pressure' },
  { id: 'guessing', label: 'Guessing' },
];

export const MistakesPage: React.FC<MistakesPageProps> = ({ onStartRevision }) => {
  const { examUserId, isOnline, toggleBookmark, setMusicMode, reportError } = useArcade();
  const [activeTab, setActiveTab] = useState<'mistakes' | 'saved'>('mistakes');
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [savedItems, setSavedItems] = useState<ExamQuestion[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMusicMode('home');
  }, [setMusicMode]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (!isOnline) {
        const cache = readOfflineCache();
        setMistakes(cache.mistakes);
        setLoading(false);
        return;
      }

      const [mRes, bRes] = await Promise.all([
        fetch(`/api/exam/mistakes?userId=${encodeURIComponent(examUserId)}`),
        fetch(`/api/exam/bookmarks?userId=${encodeURIComponent(examUserId)}`),
      ]);
      if (mRes.ok) {
        const md = await mRes.json();
        setMistakes(md.mistakes || []);
        updateOfflineCache({ mistakes: md.mistakes || [] });
      }
      if (bRes.ok) {
        const bd = await bRes.json();
        setSavedItems(bd.items || []);
      }
    } catch (err) {
      reportError(String(err));
    } finally {
      setLoading(false);
    }
  }, [examUserId, isOnline, reportError]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateMistakeCategory = async (questionId: string, cat: MistakeCategory) => {
    setMistakes((prev) =>
      prev.map((m) => (m.questionId === questionId ? { ...m, mistakeCategory: cat } : m))
    );
    if (!isOnline) return;
    await fetch(`/api/exam/mistakes/${encodeURIComponent(questionId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: examUserId, mistakeCategory: cat }),
    });
  };

  const resolveOrRemove = async (questionId: string) => {
    setMistakes((prev) => prev.filter((m) => m.questionId !== questionId));
    if (!isOnline) return;
    await fetch(
      `/api/exam/mistakes/${encodeURIComponent(questionId)}?userId=${encodeURIComponent(examUserId)}`,
      { method: 'DELETE' }
    );
  };

  const visibleMistakes = mistakes.filter((m) =>
    filterCategory === 'all' ? true : m.mistakeCategory === filterCategory
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--exam-text)]">My Mistakes & Saved</h1>
          <p className="text-sm text-[var(--exam-text-secondary)]">
            Categorize errors, review explanations, retry missed questions, and drill saved items.
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'mistakes' && visibleMistakes.length > 0 && (
            <button
              type="button"
              onClick={() =>
                onStartRevision(
                  visibleMistakes.map((m) => m.questionId),
                  { mode: 'revision' }
                )
              }
              className="exam-btn exam-btn-primary text-sm"
            >
              <RotateCcw size={15} /> Retry Mistakes ({visibleMistakes.length})
            </button>
          )}
          {activeTab === 'saved' && savedItems.length > 0 && (
            <button
              type="button"
              onClick={() =>
                onStartRevision(
                  savedItems.map((q) => q.id),
                  { mode: 'practice' }
                )
              }
              className="exam-btn exam-btn-primary text-sm"
            >
              <Play size={15} fill="currentColor" /> Practice Saved ({savedItems.length})
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--exam-border)] pb-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('mistakes')}
            className={`px-4 py-2 rounded-md text-sm font-semibold cursor-pointer ${
              activeTab === 'mistakes'
                ? 'bg-[var(--exam-accent)] text-white'
                : 'bg-[var(--exam-surface)] border border-[var(--exam-border-strong)] text-[var(--exam-text-secondary)]'
            }`}
          >
            My Mistakes ({mistakes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2 rounded-md text-sm font-semibold cursor-pointer ${
              activeTab === 'saved'
                ? 'bg-[var(--exam-accent)] text-white'
                : 'bg-[var(--exam-surface)] border border-[var(--exam-border-strong)] text-[var(--exam-text-secondary)]'
            }`}
          >
            Saved Questions ({savedItems.length})
          </button>
        </div>

        {activeTab === 'mistakes' && mistakes.length > 0 && (
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            aria-label="Filter by mistake category"
            className="exam-input px-3 py-2 text-xs sm:text-sm"
          >
            <option value="all">All Mistake Types</option>
            {MISTAKE_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="exam-card p-8 text-center text-sm text-[var(--exam-text-muted)]">
          Loading...
        </div>
      ) : activeTab === 'mistakes' ? (
        visibleMistakes.length === 0 ? (
          <div className="exam-card p-8 text-center space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-[var(--exam-success)]" />
            <div className="text-base font-bold text-[var(--exam-text)]">
              No unresolved mistakes recorded
            </div>
            <p className="text-sm text-[var(--exam-text-secondary)]">
              Any wrong answer during a quiz is automatically captured here with its explanation and trap note.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleMistakes.map((m) => (
              <div key={m.id} className="exam-card p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-[var(--exam-text-muted)]">
                      {m.subject} · {m.topic} · Missed {m.timesMissed}x
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-[var(--exam-text)] mt-1">
                      {m.question?.question || m.questionId}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={m.mistakeCategory}
                      onChange={(e) =>
                        void updateMistakeCategory(m.questionId, e.target.value as MistakeCategory)
                      }
                      aria-label="Mistake category"
                      className="exam-input px-2.5 py-1.5 text-xs"
                    >
                      {MISTAKE_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => void resolveOrRemove(m.questionId)}
                      aria-label="Remove mistake"
                      className="p-2 rounded-md border border-[var(--exam-border-strong)] text-[var(--exam-text-muted)] hover:text-[var(--exam-danger)] cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {m.question && (
                  <div className="exam-card-subtle p-3.5 text-xs sm:text-sm space-y-1.5">
                    <div className="text-[var(--exam-success)] font-semibold">
                      Correct:{' '}
                      {formatAnswerLabel(
                        m.question.questionType,
                        m.question.answer,
                        m.question.options,
                        m.question.matchPairs?.right
                      )}
                    </div>
                    <div className="text-[var(--exam-text-secondary)]">
                      <strong>Why:</strong> {m.question.explanation.why}
                    </div>
                    <div className="text-[var(--exam-warning)]">
                      <strong>Common Trap:</strong> {m.question.explanation.commonTrap}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onStartRevision([m.questionId], { mode: 'revision' })}
                    className="exam-btn exam-btn-secondary text-xs min-h-[36px] py-1.5"
                  >
                    <RotateCcw size={13} /> Retry Question
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onStartRevision([], {
                        mode: 'practice',
                        subject: m.subject,
                        difficulty: 'Medium',
                      })
                    }
                    className="exam-btn exam-btn-secondary text-xs min-h-[36px] py-1.5"
                  >
                    Practice Similar ({m.subject})
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : savedItems.length === 0 ? (
        <div className="exam-card p-8 text-center space-y-2">
          <Bookmark size={32} className="mx-auto text-[var(--exam-text-muted)]" />
          <div className="text-base font-bold text-[var(--exam-text)]">No saved questions yet</div>
          <p className="text-sm text-[var(--exam-text-secondary)]">
            Bookmark tricky questions during quizzes or from the Question Bank to review them here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {savedItems.map((q) => (
            <div key={q.id} className="exam-card p-5 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-[var(--exam-text-muted)]">
                    {q.subject} · {q.chapter} · {q.difficulty}
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--exam-text)] mt-1">
                    {q.question}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void toggleBookmark(q.id);
                    setSavedItems((prev) => prev.filter((item) => item.id !== q.id));
                  }}
                  aria-label="Remove bookmark"
                  className="p-2 rounded-md border border-[var(--exam-warning)] text-[var(--exam-warning)] cursor-pointer"
                >
                  <Bookmark size={15} fill="currentColor" />
                </button>
              </div>
              <div className="text-xs sm:text-sm text-[var(--exam-success)] font-semibold">
                Answer:{' '}
                {formatAnswerLabel(q.questionType, q.answer, q.options, q.matchPairs?.right)}
              </div>
              <div className="text-xs sm:text-sm text-[var(--exam-text-secondary)]">
                {q.explanation.why}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
