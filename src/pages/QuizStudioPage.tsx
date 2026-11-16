import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Clock,
  Flame,
  Gamepad2,
  Heart,
  Play,
  RefreshCw,
  ShieldCheck,
  Target,
  Zap,
} from 'lucide-react';
import { EXAM_CATEGORIES } from '../../shared/categories.ts';
import type {
  DailyExamStatus,
  ExamDifficulty,
  ExamMode,
  ExamSettings,
  QuestionType,
} from '../../shared/types.ts';
import { useArcade } from '../context/ArcadeContext.tsx';

interface QuizStudioPageProps {
  initialPreset?: Partial<ExamSettings> | null;
  onStartQuiz: (settings: ExamSettings) => void;
  onOpenArcade: () => void;
}

const QUIZ_MODES: Array<{
  id: ExamMode;
  title: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: 'quick', title: 'Quick Quiz', desc: '10 focused questions with instant insights.', icon: Zap },
  { id: 'practice', title: 'Practice Mode', desc: 'Custom count & filters with full breakdowns.', icon: BookOpen },
  { id: 'timed', title: 'Timed Quiz', desc: 'Fixed clock, no answer reveal until submit.', icon: Clock },
  { id: 'mock', title: 'Mock Test', desc: 'Full exam hall UI, palette & negative marking.', icon: ShieldCheck },
  { id: 'rapid', title: 'Rapid Fire', desc: 'Short, snappy stems under a 2-minute sprint.', icon: Flame },
  { id: 'weak', title: 'Weak Topics', desc: 'Targets concepts from your past mistakes.', icon: Target },
  { id: 'daily', title: 'Daily Challenge', desc: '1 attempt per day · Ranked globally.', icon: Award },
  { id: 'survival', title: 'Survival Mode', desc: '3 lives · Every wrong answer costs a heart.', icon: Heart },
  { id: 'revision', title: 'Revision Mode', desc: 'Drill unresolved items from My Mistakes.', icon: RefreshCw },
];

export const QuizStudioPage: React.FC<QuizStudioPageProps> = ({
  initialPreset,
  onStartQuiz,
  onOpenArcade,
}) => {
  const { examUserId, setMusicMode } = useArcade();

  const [mode, setMode] = useState<ExamMode>(initialPreset?.mode || 'quick');
  const [categoryId, setCategoryId] = useState<string>(initialPreset?.categoryId || 'all');
  const [subject, setSubject] = useState<string>(initialPreset?.subject || 'all');
  const [chapter, setChapter] = useState<string>(initialPreset?.chapter || 'all');
  const [difficulty, setDifficulty] = useState<ExamDifficulty | 'Adaptive' | 'Mixed'>(
    initialPreset?.difficulty || 'Adaptive'
  );
  const [questionType, setQuestionType] = useState<QuestionType | 'All'>(
    initialPreset?.questionType || 'All'
  );
  const [questionCount, setQuestionCount] = useState<number>(initialPreset?.questionCount || 10);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(
    initialPreset?.timeLimitMinutes || 10
  );
  const [negativeMarking, setNegativeMarking] = useState<number>(
    initialPreset?.negativeMarking ?? 0
  );

  const [subjects, setSubjects] = useState<string[]>([]);
  const [chaptersBySubject, setChaptersBySubject] = useState<Record<string, string[]>>({});
  const [dailyStatus, setDailyStatus] = useState<DailyExamStatus | null>(null);

  useEffect(() => {
    setMusicMode('home');
  }, [setMusicMode]);

  useEffect(() => {
    if (initialPreset) {
      if (initialPreset.mode) setMode(initialPreset.mode);
      if (initialPreset.categoryId) setCategoryId(initialPreset.categoryId);
      if (initialPreset.subject) setSubject(initialPreset.subject);
      if (initialPreset.difficulty) setDifficulty(initialPreset.difficulty);
      if (initialPreset.questionCount) setQuestionCount(initialPreset.questionCount);
    }
  }, [initialPreset]);

  useEffect(() => {
    fetch('/api/exam/categories')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.subjects)) setSubjects(d.subjects);
        if (d.chaptersBySubject) setChaptersBySubject(d.chaptersBySubject);
      })
      .catch(() => {});

    fetch(`/api/exam/daily-status?userId=${encodeURIComponent(examUserId)}`)
      .then((r) => r.json())
      .then((d) => setDailyStatus(d))
      .catch(() => {});
  }, [examUserId]);

  const handleSelectMode = (nextMode: ExamMode) => {
    setMode(nextMode);
    if (nextMode === 'quick' || nextMode === 'daily') {
      setQuestionCount(10);
      setTimeLimitMinutes(8);
      setNegativeMarking(0);
    } else if (nextMode === 'mock') {
      setQuestionCount(20);
      setTimeLimitMinutes(25);
      setNegativeMarking(1);
    } else if (nextMode === 'rapid') {
      setQuestionCount(10);
      setTimeLimitMinutes(2);
      setNegativeMarking(0);
    } else if (nextMode === 'timed') {
      setQuestionCount(15);
      setTimeLimitMinutes(12);
      setNegativeMarking(0);
    } else {
      setNegativeMarking(0);
    }
  };

  const availableChapters = subject !== 'all' ? chaptersBySubject[subject] || [] : [];
  const dailyDone = mode === 'daily' && dailyStatus?.completed;

  const launch = () => {
    onStartQuiz({
      mode,
      categoryId,
      subject,
      chapter,
      difficulty,
      questionType,
      questionCount,
      timeLimitMinutes,
      negativeMarking,
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--exam-text)]">Quiz & Exam Studio</h1>
          <p className="text-sm text-[var(--exam-text-secondary)]">
            Choose a mode, configure exam parameters, and start a timed or adaptive session.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenArcade}
          className="exam-btn exam-btn-secondary text-sm"
        >
          <Gamepad2 size={16} /> Arcade Mini-Games
        </button>
      </div>

      {/* 9 Quiz Modes Grid */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--exam-text-muted)] mb-3">
          1. Select Mode
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUIZ_MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectMode(m.id)}
                className={`p-4 rounded-lg border text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--exam-accent-soft)] border-[var(--exam-accent)]'
                    : 'bg-[var(--exam-surface)] border-[var(--exam-border)] hover:border-[var(--exam-border-strong)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-sm text-[var(--exam-text)] flex items-center gap-2">
                    <Icon
                      size={16}
                      className={active ? 'text-[var(--exam-accent)]' : 'text-[var(--exam-text-muted)]'}
                    />
                    {m.title}
                  </span>
                  {m.id === 'daily' && dailyStatus?.completed && (
                    <span className="text-[11px] font-semibold text-[var(--exam-success)]">
                      Completed
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--exam-text-secondary)]">{m.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Daily Challenge Already Completed Notice */}
      {dailyDone && dailyStatus && (
        <div className="exam-card p-5 border-[var(--exam-success)] flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase text-[var(--exam-success)]">
              Today’s Daily Challenge Completed
            </div>
            <div className="text-sm text-[var(--exam-text)] mt-1 font-code">
              Score: {dailyStatus.score}/{dailyStatus.maxScore} · Accuracy: {dailyStatus.accuracy}% ·
              Time: {dailyStatus.timeSpentSeconds}s · Rank #{dailyStatus.rank ?? 1}
              {dailyStatus.weakArea ? ` · Focus area: ${dailyStatus.weakArea}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSelectMode('quick')}
            className="exam-btn exam-btn-secondary text-xs"
          >
            Switch to Quick Quiz
          </button>
        </div>
      )}

      {/* Categories Selector (All 14 Configurable Categories) */}
      <section className="exam-card p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--exam-text-muted)] mb-3">
            2. Category / Exam Track
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryId('all')}
              className={`px-3.5 py-2 rounded-md border text-xs font-semibold cursor-pointer ${
                categoryId === 'all'
                  ? 'bg-[var(--exam-accent)] text-white border-[var(--exam-accent)]'
                  : 'bg-[var(--exam-surface-alt)] border-[var(--exam-border-strong)] text-[var(--exam-text-secondary)]'
              }`}
            >
              All Categories
            </button>
            {EXAM_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`px-3.5 py-2 rounded-md border text-xs font-semibold cursor-pointer ${
                  categoryId === cat.id
                    ? 'bg-[var(--exam-accent)] text-white border-[var(--exam-accent)]'
                    : 'bg-[var(--exam-surface-alt)] border-[var(--exam-border-strong)] text-[var(--exam-text-secondary)]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Exam Settings Controls */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--exam-text-muted)] mb-3">
            3. Exam Settings
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--exam-text-secondary)] mb-1">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setChapter('all');
                }}
                className="exam-input w-full px-3 py-2.5 text-sm"
              >
                <option value="all">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--exam-text-secondary)] mb-1">
                Chapter
              </label>
              <select
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                disabled={subject === 'all'}
                className="exam-input w-full px-3 py-2.5 text-sm disabled:opacity-50"
              >
                <option value="all">All Chapters</option>
                {availableChapters.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--exam-text-secondary)] mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as ExamSettings['difficulty'])}
                className="exam-input w-full px-3 py-2.5 text-sm"
              >
                <option value="Adaptive">Adaptive (Learns from you)</option>
                <option value="Mixed">Mixed</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--exam-text-secondary)] mb-1">
                Question Type
              </label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as ExamSettings['questionType'])}
                className="exam-input w-full px-3 py-2.5 text-sm"
              >
                <option value="All">All Question Types</option>
                <option value="single">Single Correct MCQ</option>
                <option value="multiple">Multiple Correct</option>
                <option value="truefalse">True / False</option>
                <option value="integer">Integer / Numeric</option>
                <option value="assertion_reason">Assertion / Reason</option>
                <option value="match">Match the Following</option>
                <option value="image">Image / Diagram Based</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--exam-text-secondary)] mb-1">
                Number of Questions
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                disabled={mode === 'quick' || mode === 'daily'}
                className="exam-input w-full px-3 py-2.5 text-sm disabled:opacity-60"
              >
                {[5, 10, 15, 20, 30].map((n) => (
                  <option key={n} value={n}>
                    {n} Questions
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--exam-text-secondary)] mb-1">
                Time Limit & Negative Marking
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                  aria-label="Time limit in minutes"
                  className="exam-input px-2.5 py-2.5 text-sm"
                >
                  {[2, 5, 8, 10, 15, 25, 45].map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
                <select
                  value={negativeMarking}
                  onChange={(e) => setNegativeMarking(Number(e.target.value))}
                  aria-label="Negative marking penalty"
                  className="exam-input px-2.5 py-2.5 text-sm"
                >
                  <option value={0}>No Neg (0)</option>
                  <option value={0.25}>−0.25</option>
                  <option value={1}>−1 (Mock)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--exam-border)]">
          <div className="text-xs text-[var(--exam-text-muted)]">
            {mode === 'mock' || mode === 'timed'
              ? 'Exam Integrity: Answers stay hidden until final submission.'
              : 'Smart Explanations: Concept, Why, Common Trap & Quick Tip unlocked after each check.'}
          </div>
          <button
            type="button"
            disabled={Boolean(dailyDone)}
            onClick={launch}
            className="exam-btn exam-btn-primary px-7 py-3 text-sm"
          >
            <Play size={16} fill="currentColor" /> Start {QUIZ_MODES.find((x) => x.id === mode)?.title}
          </button>
        </div>
      </section>
    </div>
  );
};
