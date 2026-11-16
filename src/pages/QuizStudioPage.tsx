import React, { useEffect, useState } from 'react';
import { arcadeAudio } from '../audio/arcadeAudio.ts';
import { EXAM_CATEGORIES } from '../../shared/categories.ts';
import type {
  DailyExamStatus,
  ExamDifficulty,
  ExamMode,
  ExamSettings,
  QuestionType,
} from '../../shared/types.ts';
import { useArcade } from '../context/ArcadeContext.tsx';
import { safeFetchJson } from '../utils/apiClient.ts';
import { PixelIcon, type PixelIconName } from '../components/pixel/PixelArtAssets.tsx';

interface QuizStudioPageProps {
  initialPreset?: Partial<ExamSettings> | null;
  onStartQuiz: (settings: ExamSettings) => void;
  onOpenArcade: () => void;
}

const QUIZ_MODES: Array<{
  id: ExamMode;
  title: string;
  desc: string;
  icon: PixelIconName;
}> = [
  { id: 'quick', title: 'Quick Quiz', desc: '10 questions · Instant feedback', icon: 'quiz' },
  { id: 'practice', title: 'Practice', desc: 'Custom topics & full explanations', icon: 'book' },
  { id: 'timed', title: 'Timed Quiz', desc: 'Fixed clock · Reveal at finish', icon: 'timer' },
  { id: 'mock', title: 'Mock Exam', desc: 'Question palette & negative marks', icon: 'trophy' },
  { id: 'rapid', title: 'Rapid Fire', desc: 'Fast 2-minute speed sprint', icon: 'flame' },
  { id: 'weak', title: 'Weak Topics', desc: 'Drills areas you missed most', icon: 'target' },
  { id: 'daily', title: 'Daily Quest', desc: '1 global challenge each day', icon: 'score' },
  { id: 'survival', title: 'Survival', desc: '3 hearts · 1 mistake costs a life', icon: 'heart' },
  { id: 'revision', title: 'Revision', desc: 'Retry your saved mistakes', icon: 'refresh' },
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

  const [showAdvanced, setShowAdvanced] = useState(false);
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
    void safeFetchJson<{ subjects?: string[]; chaptersBySubject?: Record<string, string[]> }>(
      '/api/exam/categories'
    ).then((res) => {
      if (res.ok && res.data) {
        if (Array.isArray(res.data.subjects)) setSubjects(res.data.subjects);
        if (res.data.chaptersBySubject) setChaptersBySubject(res.data.chaptersBySubject);
      }
    });

    void safeFetchJson<DailyExamStatus>(
      `/api/exam/daily-status?userId=${encodeURIComponent(examUserId)}`
    ).then((res) => {
      if (res.ok && res.data) setDailyStatus(res.data);
    });
  }, [examUserId]);

  const handleSelectMode = (nextMode: ExamMode) => {
    arcadeAudio.playSfx('click');
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
    arcadeAudio.playSfx('gameStart');
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-7 sm:py-9 space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-pixel text-base sm:text-xl text-[var(--exam-text)]">
            CATEGORIES &amp; MODES
          </h1>
          <p className="text-sm text-[var(--exam-text-secondary)] mt-1">
            Pick any category block and game mode, then press Start Quiz.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            arcadeAudio.playSfx('click');
            onOpenArcade();
          }}
          className="font-display-pixel text-xs sm:text-sm text-[var(--exam-accent)] hover:underline flex items-center gap-1.5 cursor-pointer"
        >
          <PixelIcon name="arcade" size={15} />
          <span>Play Arcade Mini-Games →</span>
        </button>
      </div>

      {/* Category Selector Blocks */}
      <section className="exam-card p-5 sm:p-6 space-y-4">
        <h2 className="font-pixel text-xs text-[var(--exam-text-muted)]">1. PICK A CATEGORY</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              setCategoryId('all');
            }}
            className={`px-3.5 py-2 border-2 font-display-pixel text-xs font-bold cursor-pointer ${
              categoryId === 'all'
                ? 'bg-[var(--voxel-gold)] text-[#0B0F1A] border-[#0B0F1A]'
                : 'bg-[var(--exam-surface-alt)] border-[var(--exam-border)] text-[var(--exam-text)] hover:border-[var(--exam-accent)]'
            }`}
          >
            ALL CATEGORIES
          </button>
          {EXAM_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                arcadeAudio.playSfx('click');
                setCategoryId(cat.id);
              }}
              className={`px-3.5 py-2 border-2 font-display-pixel text-xs font-bold cursor-pointer ${
                categoryId === cat.id
                  ? 'bg-[var(--voxel-gold)] text-[#0B0F1A] border-[#0B0F1A]'
                  : 'bg-[var(--exam-surface-alt)] border-[var(--exam-border)] text-[var(--exam-text)] hover:border-[var(--exam-accent)]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* 9 Quiz Modes Grid */}
      <section className="space-y-3">
        <h2 className="font-pixel text-xs text-[var(--exam-text-muted)]">2. PICK A GAME MODE</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUIZ_MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectMode(m.id)}
                className={`voxel-tile p-4 text-left cursor-pointer ${
                  active
                    ? 'bg-[var(--exam-accent-soft)] border-[var(--voxel-gold)] ring-2 ring-[var(--voxel-gold)]'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-display-pixel font-bold text-sm text-[var(--exam-text)] flex items-center gap-2">
                    <span className={active ? 'text-[var(--voxel-gold)]' : 'text-[var(--exam-accent)]'}>
                      <PixelIcon name={m.icon} size={16} />
                    </span>
                    {m.title}
                  </span>
                  {m.id === 'daily' && dailyStatus?.completed && (
                    <span className="font-display-pixel text-[10px] text-[var(--exam-success)]">
                      DONE
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
            <div className="font-pixel text-xs text-[var(--exam-success)]">
              DAILY QUEST COMPLETE!
            </div>
            <div className="text-sm text-[var(--exam-text)] mt-1 font-code">
              Score: {dailyStatus.score}/{dailyStatus.maxScore} · {dailyStatus.accuracy}% · Rank #
              {dailyStatus.rank ?? 1}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSelectMode('quick')}
            className="exam-btn exam-btn-secondary text-xs"
          >
            Play Quick Quiz Instead
          </button>
        </div>
      )}

      {/* Clean Custom Settings + Primary Start Button */}
      <section className="exam-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              setShowAdvanced((v) => !v);
            }}
            className="font-display-pixel text-xs sm:text-sm text-[var(--exam-accent)] hover:underline cursor-pointer"
          >
            {showAdvanced ? 'Hide Custom Options ▲' : 'Customize Difficulty, Count & Timer ▼'}
          </button>

          <span className="font-code text-xs text-[var(--exam-text-muted)]">
            {questionCount} Qs · {timeLimitMinutes} min · {difficulty}
          </span>
        </div>

        {showAdvanced && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t-2 border-[var(--exam-border)]">
            <div>
              <label className="block font-display-pixel text-xs text-[var(--exam-text-secondary)] mb-1">
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
              <label className="block font-display-pixel text-xs text-[var(--exam-text-secondary)] mb-1">
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
              <label className="block font-display-pixel text-xs text-[var(--exam-text-secondary)] mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as ExamSettings['difficulty'])}
                className="exam-input w-full px-3 py-2.5 text-sm"
              >
                <option value="Adaptive">Adaptive</option>
                <option value="Mixed">Mixed</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            <div>
              <label className="block font-display-pixel text-xs text-[var(--exam-text-secondary)] mb-1">
                Question Type
              </label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as ExamSettings['questionType'])}
                className="exam-input w-full px-3 py-2.5 text-sm"
              >
                <option value="All">All Types</option>
                <option value="single">Single MCQ</option>
                <option value="multiple">Multiple Correct</option>
                <option value="truefalse">True / False</option>
                <option value="integer">Integer / Numeric</option>
                <option value="assertion_reason">Assertion / Reason</option>
                <option value="match">Match Following</option>
                <option value="image">Diagram Based</option>
              </select>
            </div>

            <div>
              <label className="block font-display-pixel text-xs text-[var(--exam-text-secondary)] mb-1">
                Questions
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
              <label className="block font-display-pixel text-xs text-[var(--exam-text-secondary)] mb-1">
                Timer &amp; Marking
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
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            disabled={Boolean(dailyDone)}
            onClick={launch}
            className="exam-btn exam-btn-primary w-full sm:w-auto px-8 py-3.5 text-sm sm:text-base"
          >
            <PixelIcon name="play" size={16} />
            <span>START {QUIZ_MODES.find((x) => x.id === mode)?.title.toUpperCase()}</span>
          </button>
        </div>
      </section>
    </div>
  );
};
