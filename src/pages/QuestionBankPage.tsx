import React, { useCallback, useEffect, useState } from 'react';
import { Bookmark, ChevronDown, ChevronUp, Play, Search } from 'lucide-react';
import { EXAM_CATEGORIES } from '../../shared/categories.ts';
import type { ExamQuestion, ExamSettings } from '../../shared/types.ts';
import { useArcade } from '../context/ArcadeContext.tsx';
import { readOfflineCache, updateOfflineCache } from '../utils/storageMigration.ts';
import { formatAnswerLabel } from '../components/quiz/SmartExplanationCard.tsx';

interface QuestionBankPageProps {
  onPracticeQuestions: (questionIds: string[], settings?: Partial<ExamSettings>) => void;
}

export const QuestionBankPage: React.FC<QuestionBankPageProps> = ({ onPracticeQuestions }) => {
  const { bookmarkedIds, toggleBookmark, isOnline, setMusicMode, reportError } = useArcade();

  const [qText, setQText] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [subject, setSubject] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [questionType, setQuestionType] = useState('all');
  const [source, setSource] = useState('all');
  const [page, setPage] = useState(1);

  const [subjects, setSubjects] = useState<string[]>([]);
  const [items, setItems] = useState<ExamQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setMusicMode('home');
  }, [setMusicMode]);

  useEffect(() => {
    fetch('/api/exam/categories')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.subjects)) setSubjects(d.subjects);
      })
      .catch(() => {});
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      if (!isOnline) {
        const cached = readOfflineCache().questions;
        setItems(cached);
        setTotal(cached.length);
        setTotalPages(1);
        setLoading(false);
        return;
      }

      const qs = new URLSearchParams({
        q: qText,
        categoryId,
        subject,
        difficulty,
        questionType,
        source,
        page: String(page),
        limit: '15',
      });
      const res = await fetch(`/api/exam/questions?${qs.toString()}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.items)) {
        setItems(data.items);
        setTotal(data.total ?? data.items.length);
        setTotalPages(data.totalPages ?? 1);
        updateOfflineCache({ questions: data.items });
      }
    } catch (err) {
      reportError(String(err));
    } finally {
      setLoading(false);
    }
  }, [categoryId, difficulty, isOnline, page, qText, questionType, reportError, source, subject]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--exam-text)]">Question Bank</h1>
          <p className="text-sm text-[var(--exam-text-secondary)]">
            Search verified questions across subjects, chapters, difficulty, types, and PYQ/Generated sources.
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => onPracticeQuestions(items.slice(0, 10).map((i) => i.id))}
            className="exam-btn exam-btn-primary text-sm"
          >
            <Play size={15} fill="currentColor" /> Practice Shown ({Math.min(10, items.length)})
          </button>
        )}
      </div>

      {/* Multi-Filters Bar */}
      <div className="exam-card p-4 space-y-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--exam-text-muted)]"
          />
          <input
            type="text"
            value={qText}
            onChange={(e) => {
              setQText(e.target.value);
              setPage(1);
            }}
            placeholder="Search by question text, topic, chapter, or tag..."
            className="exam-input w-full pl-10 pr-4 py-2.5 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by category"
            className="exam-input px-3 py-2 text-xs sm:text-sm"
          >
            <option value="all">All Categories</option>
            {EXAM_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by subject"
            className="exam-input px-3 py-2 text-xs sm:text-sm"
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by difficulty"
            className="exam-input px-3 py-2 text-xs sm:text-sm"
          >
            <option value="all">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
            <option value="Expert">Expert</option>
          </select>

          <select
            value={questionType}
            onChange={(e) => {
              setQuestionType(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by question type"
            className="exam-input px-3 py-2 text-xs sm:text-sm"
          >
            <option value="all">All Types</option>
            <option value="single">Single MCQ</option>
            <option value="multiple">Multiple Correct</option>
            <option value="truefalse">True / False</option>
            <option value="integer">Integer / Numeric</option>
            <option value="assertion_reason">Assertion / Reason</option>
            <option value="match">Match Following</option>
            <option value="image">Image / Diagram</option>
          </select>

          <select
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by source"
            className="exam-input px-3 py-2 text-xs sm:text-sm"
          >
            <option value="all">All Sources</option>
            <option value="CGQUIZ GENERATED">CGQUIZ GENERATED</option>
            <option value="PYQ">Verified PYQs</option>
          </select>
        </div>
      </div>

      <div className="text-xs font-medium text-[var(--exam-text-muted)] tabular-nums">
        Showing {items.length} of {total} verified questions · Page {page} of {totalPages}
      </div>

      {/* Results List */}
      {loading ? (
        <div className="exam-card p-8 text-center text-sm text-[var(--exam-text-muted)]">
          Searching question bank...
        </div>
      ) : items.length === 0 ? (
        <div className="exam-card p-8 text-center space-y-3">
          <div className="text-base font-semibold text-[var(--exam-text)]">
            No matching questions found.
          </div>
          <button
            type="button"
            onClick={() => {
              setQText('');
              setCategoryId('all');
              setSubject('all');
              setDifficulty('all');
              setQuestionType('all');
              setSource('all');
              setPage(1);
            }}
            className="exam-btn exam-btn-secondary text-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((q) => {
            const isOpen = expandedId === q.id;
            const saved = bookmarkedIds.includes(q.id);
            return (
              <div key={q.id} className="exam-card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="text-xs text-[var(--exam-text-muted)] font-medium">
                      <span className="text-[var(--exam-accent)] font-semibold">{q.subject}</span>
                      <span> · {q.chapter}</span>
                      <span> · {q.difficulty}</span>
                      <span> · {q.questionType}</span>
                      <span> · {q.source}{q.year ? ` ${q.year}` : ''}</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-[var(--exam-text)]">
                      {q.question}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void toggleBookmark(q.id)}
                      aria-label={saved ? 'Remove bookmark' : 'Bookmark question'}
                      className={`p-2 rounded-md border cursor-pointer ${
                        saved
                          ? 'bg-[var(--exam-warning-soft)] border-[var(--exam-warning)] text-[var(--exam-warning)]'
                          : 'border-[var(--exam-border-strong)] text-[var(--exam-text-muted)]'
                      }`}
                    >
                      <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : q.id)}
                      className="px-3 py-2 rounded-md border border-[var(--exam-border-strong)] text-xs font-semibold text-[var(--exam-text)] flex items-center gap-1 cursor-pointer"
                    >
                      {isOpen ? (
                        <>
                          Hide <ChevronUp size={14} />
                        </>
                      ) : (
                        <>
                          Answer <ChevronDown size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-[var(--exam-border)] space-y-2.5 text-sm">
                    <div className="text-[var(--exam-success)] font-semibold">
                      Correct Answer:{' '}
                      {formatAnswerLabel(q.questionType, q.answer, q.options, q.matchPairs?.right)}
                    </div>
                    <div className="text-[var(--exam-text-secondary)]">
                      <strong>Why:</strong> {q.explanation.why}
                    </div>
                    <div className="text-xs text-[var(--exam-text-muted)]">
                      <strong>Concept:</strong> {q.explanation.concept} ·{' '}
                      <strong>Quick Tip:</strong> {q.explanation.shortcut}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="exam-btn exam-btn-secondary text-xs"
          >
            Previous
          </button>
          <span className="font-code text-xs text-[var(--exam-text-muted)] tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="exam-btn exam-btn-secondary text-xs"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
