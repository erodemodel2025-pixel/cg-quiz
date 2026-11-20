import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Atom,
  BookOpen,
  Bot,
  Car,
  CheckCircle2,
  Clock,
  Cog,
  Cpu,
  Flame,
  FlaskConical,
  Globe,
  Lightbulb,
  Play,
  Rocket,
  RotateCcw,
  ShieldCheck,
  Sigma,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import {
  EASY_CATEGORIES,
  EASY_QUESTIONS,
  selectEasyQuizRound,
} from '../../shared/easyQuestions.ts';
import type { EasyCategoryId, EasyCategoryInfo, EasyDifficulty, EasyQuizQuestion } from '../../shared/types.ts';
import { arcadeAudio } from '../audio/arcadeAudio.ts';
import { useArcade } from '../context/ArcadeContext.tsx';
import { submitEasyQuizCompletion } from '../utils/creationsStore.ts';

interface EasyQuizPageProps {
  onOpenAdvancedStudio: () => void;
  onOpenArena: () => void;
}

type Stage = 'select' | 'playing' | 'summary';
type DiffFilter = 'All' | EasyDifficulty;

interface AnswerRecord {
  question: EasyQuizQuestion;
  selectedIndex: number;
  isCorrect: boolean;
}

function getCategoryIcon(iconKey: EasyCategoryId | string) {
  switch (iconKey) {
    case 'globe':
    case 'general-knowledge':
      return Globe;
    case 'flask':
    case 'science':
      return FlaskConical;
    case 'atom':
    case 'physics':
      return Atom;
    case 'beaker':
    case 'chemistry':
      return FlaskConical;
    case 'calculator':
    case 'mathematics':
      return Sigma;
    case 'cpu':
    case 'computer-science':
      return Cpu;
    case 'wrench':
    case 'engineering':
      return Cog;
    case 'car':
    case 'automobile':
      return Car;
    case 'rocket':
    case 'space':
      return Rocket;
    case 'brain':
    case 'ai':
      return Bot;
    default:
      return Lightbulb;
  }
}

const QUESTION_COUNT_PER_ROUND = 10;

export const EasyQuizPage: React.FC<EasyQuizPageProps> = ({
  onOpenAdvancedStudio,
  onOpenArena,
}) => {
  const { player, updateLocalPlayer, setMusicMode } = useArcade();

  const [stage, setStage] = useState<Stage>('select');
  const [selectedCategory, setSelectedCategory] = useState<EasyCategoryInfo>(EASY_CATEGORIES[0]);
  const [difficultyFilter, setDifficultyFilter] = useState<DiffFilter>('All');
  const [timerEnabled, setTimerEnabled] = useState(false);

  const [roundQuestions, setRoundQuestions] = useState<EasyQuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(25);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [leveledUpBanner, setLeveledUpBanner] = useState(false);

  useEffect(() => {
    setMusicMode(stage === 'playing' ? 'focus' : 'home');
  }, [stage, setMusicMode]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of EASY_QUESTIONS) {
      map[q.categoryId] = (map[q.categoryId] || 0) + 1;
    }
    return map;
  }, []);

  const startRound = useCallback(
    (category: EasyCategoryInfo, diff: DiffFilter = difficultyFilter) => {
      arcadeAudio.playSfx('gameStart');
      const picked = selectEasyQuizRound({
        categoryId: category.id,
        difficulty: diff,
        count: QUESTION_COUNT_PER_ROUND,
      });
      setSelectedCategory(category);
      setRoundQuestions(picked);
      setCurrentIndex(0);
      setSelectedOption(null);
      setRecords([]);
      setStreak(0);
      setBestStreak(0);
      setSecondsLeft(25);
      setXpAwarded(0);
      setLeveledUpBanner(false);
      setStage('playing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [difficultyFilter]
  );

  const currentQuestion = roundQuestions[currentIndex] || null;
  const isAnswered = selectedOption !== null;

  const handleSelectOption = useCallback(
    (idx: number) => {
      if (!currentQuestion || isAnswered) return;
      const isCorrect = idx === currentQuestion.correctIndex;
      setSelectedOption(idx);
      arcadeAudio.playSfx(isCorrect ? 'correct' : 'wrong');

      const nextStreak = isCorrect ? streak + 1 : 0;
      const nextBest = Math.max(bestStreak, nextStreak);
      setStreak(nextStreak);
      setBestStreak(nextBest);

      setRecords((prev) => [
        ...prev,
        {
          question: currentQuestion,
          selectedIndex: idx,
          isCorrect,
        },
      ]);
    },
    [currentQuestion, isAnswered, streak, bestStreak]
  );

  useEffect(() => {
    if (stage !== 'playing' || !timerEnabled || isAnswered || !currentQuestion) return;
    if (secondsLeft <= 0) {
      handleSelectOption(-1);
      return;
    }
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [stage, timerEnabled, isAnswered, secondsLeft, currentQuestion, handleSelectOption]);

  const handleNextQuestion = async () => {
    arcadeAudio.playSfx('click');
    if (currentIndex + 1 < roundQuestions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setSecondsLeft(25);
      return;
    }

    const correctTotal = records.filter((r) => r.isCorrect).length;
    const total = Math.max(1, roundQuestions.length);
    const res = await submitEasyQuizCompletion({
      userId: player?.id,
      categoryId: selectedCategory.id,
      difficulty: difficultyFilter,
      correctCount: correctTotal,
      totalQuestions: total,
      maxStreak: bestStreak,
    });
    setXpAwarded(res.xpEarned);
    setLeveledUpBanner(res.leveledUp);
    if (res.player) updateLocalPlayer(res.player);
    arcadeAudio.playSfx(res.leveledUp ? 'levelUp' : 'victory');
    setStage('summary');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const correctCount = records.filter((r) => r.isCorrect).length;
  const wrongCount = records.filter((r) => !r.isCorrect).length;

  /* ============================================================
     STAGE 1: EASY QUIZ ZONE CATEGORY SELECTION
     ============================================================ */
  if (stage === 'select') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Studio Header Banner */}
        <section className="studio-card p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="font-mono-tech text-xs font-bold uppercase tracking-wider text-[var(--studio-emerald-text)] flex items-center gap-2">
              <Sparkles size={14} /> Easy Quiz Zone · {EASY_QUESTIONS.length}+ Beginner-Friendly Questions
            </div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[var(--studio-text)]">
              Fast, Approachable Knowledge Quests
            </h1>
            <p className="text-sm sm:text-base text-[var(--studio-text-secondary)]">
              Pick any of the 11 topics below for a stress-free 10-question round with instant explanations, zero harsh penalties, and bonus XP.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                arcadeAudio.playSfx('click');
                onOpenAdvancedStudio();
              }}
              className="studio-btn studio-btn-ghost text-xs sm:text-sm"
            >
              <BookOpen size={15} className="text-[var(--studio-accent-text)]" />
              <span>Advanced / JEE Exam Studio</span>
            </button>
            <button
              type="button"
              onClick={() => {
                arcadeAudio.playSfx('click');
                onOpenArena();
              }}
              className="studio-btn studio-btn-purple text-xs sm:text-sm"
            >
              <Car size={15} />
              <span>3D Car &amp; iPhone Arena</span>
            </button>
          </div>
        </section>

        {/* Controls Bar: Difficulty + Optional Timer Toggle */}
        <div className="studio-card-solid p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono-tech text-xs font-bold uppercase text-[var(--studio-accent-text)] mr-1">
              Difficulty:
            </span>
            {(['All', 'Beginner', 'Easy', 'Easy Challenge'] as const).map((diff) => {
              const active = difficultyFilter === diff;
              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => {
                    arcadeAudio.playSfx('click');
                    setDifficultyFilter(diff);
                  }}
                  className={`studio-btn text-xs px-3.5 py-1.5 min-h-[36px] ${
                    active ? 'studio-btn-primary' : 'studio-btn-ghost'
                  }`}
                >
                  {diff}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              setTimerEnabled((v) => !v);
            }}
            className={`studio-btn text-xs px-3.5 py-1.5 min-h-[36px] ${
              timerEnabled ? 'studio-btn-amber' : 'studio-btn-ghost'
            }`}
          >
            <Clock size={14} />
            <span>{timerEnabled ? 'Timer: 25s / Question' : 'Timer: Relaxed (Off)'}</span>
          </button>
        </div>

        {/* 11 Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EASY_CATEGORIES.map((cat) => {
            const Icon = getCategoryIcon(cat.iconKey);
            const totalQs = categoryCounts[cat.id] || 30;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => startRound(cat)}
                className="studio-card-interactive p-5 text-left flex flex-col justify-between gap-4 cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white shadow-md"
                      style={{ backgroundColor: cat.accentColor }}
                    >
                      <Icon size={22} />
                    </div>
                    <span className="font-mono-tech text-xs font-bold text-[var(--studio-text-muted)]">
                      {totalQs} Questions
                    </span>
                  </div>

                  <h2 className="font-heading font-bold text-lg text-[var(--studio-text)] group-hover:text-[var(--studio-accent-text)] transition-colors">
                    {cat.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--studio-text-secondary)] mt-1 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--studio-border)] flex items-center justify-between text-xs font-sora font-bold text-[var(--studio-accent-text)]">
                  <span className="flex items-center gap-1.5">
                    <Play size={13} fill="currentColor" /> Play 10-Question Round
                  </span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ============================================================
     STAGE 2: CLEAN FOCUSED QUIZ INTERFACE
     ============================================================ */
  if (stage === 'playing' && currentQuestion) {
    const progressPct = Math.round(((currentIndex + (isAnswered ? 1 : 0)) / roundQuestions.length) * 100);
    const optionLetters = ['A', 'B', 'C', 'D'];

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Top Live Status HUD */}
        <div className="studio-card-solid p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  arcadeAudio.playSfx('click');
                  setStage('select');
                }}
                className="studio-btn studio-btn-ghost text-xs px-3 py-1.5 min-h-[36px]"
              >
                ← Categories
              </button>
              <div>
                <div className="font-mono-tech text-[11px] font-bold uppercase text-[var(--studio-accent-text)]">
                  {selectedCategory.name} · {currentQuestion.difficulty}
                </div>
                <div className="font-heading font-bold text-sm text-[var(--studio-text)]">
                  Question {currentIndex + 1} of {roundQuestions.length}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono-tech text-xs font-bold tabular-nums">
              <span className="px-2.5 py-1 rounded-lg bg-[#059669] text-white">
                ✓ {correctCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#E11D48] text-white">
                ✕ {wrongCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#D97706] text-white flex items-center gap-1">
                <Flame size={13} /> {streak}
              </span>
              {timerEnabled && (
                <span
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                    secondsLeft <= 6
                      ? 'bg-[#DC2626] text-white'
                      : 'studio-well text-[var(--studio-text)]'
                  }`}
                >
                  <Clock size={13} /> {secondsLeft}s
                </span>
              )}
            </div>
          </div>

          <div className="h-2.5 rounded-full bg-[var(--studio-surface-2)] border border-[var(--studio-border)] overflow-hidden">
            <div
              className="h-full bg-[#2563EB] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="studio-card p-6 sm:p-8 space-y-6">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-[var(--studio-text)] leading-snug">
            {currentQuestion.question}
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrectChoice = idx === currentQuestion.correctIndex;

              let btnStyle =
                'bg-[var(--studio-surface-2)] border-[var(--studio-border-strong)] hover:border-[var(--studio-accent-text)] text-[var(--studio-text)]';
              if (isAnswered) {
                if (isCorrectChoice) {
                  btnStyle = 'bg-[#059669] border-[#34D399] text-white shadow-md';
                } else if (isSelected) {
                  btnStyle = 'bg-[#DC2626] border-[#FB7185] text-white';
                } else {
                  btnStyle =
                    'bg-[var(--studio-surface-2)] border-[var(--studio-border)] text-[var(--studio-text-muted)] opacity-65';
                }
              }

              return (
                <button
                  key={`${currentQuestion.id}_${idx}`}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${btnStyle}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-lg font-mono-tech text-xs font-bold flex items-center justify-center shrink-0 border ${
                        isAnswered && (isCorrectChoice || isSelected)
                          ? 'bg-white text-[#090E1A] border-white'
                          : 'bg-[var(--studio-surface)] text-[var(--studio-accent-text)] border-[var(--studio-border-strong)]'
                      }`}
                    >
                      {optionLetters[idx]}
                    </span>
                    <span className="font-sora text-sm sm:text-base font-semibold">{opt}</span>
                  </div>

                  {isAnswered && isCorrectChoice && (
                    <CheckCircle2 size={20} className="text-white shrink-0" />
                  )}
                  {isAnswered && isSelected && !isCorrectChoice && (
                    <XCircle size={20} className="text-white shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Instant Friendly Explanation Banner */}
          {isAnswered && (
            <div className="p-4 sm:p-5 rounded-xl studio-well border-2 border-[var(--studio-border-strong)] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-heading font-bold text-sm sm:text-base text-[var(--studio-text)] flex items-center gap-2">
                  {selectedOption === currentQuestion.correctIndex ? (
                    <>
                      <CheckCircle2 size={18} className="text-[var(--studio-emerald-text)]" /> Nice! Correct Answer
                    </>
                  ) : selectedOption === -1 ? (
                    <>
                      <Clock size={18} className="text-[var(--studio-amber-text)]" /> Time&apos;s Up — Here&apos;s the Answer
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} className="text-[var(--studio-accent-text)]" /> Good Try! Let&apos;s Learn Why
                    </>
                  )}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[var(--studio-text-secondary)] leading-relaxed">
                {currentQuestion.explanation}
              </p>

              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleNextQuestion()}
                  className="studio-btn studio-btn-primary text-xs sm:text-sm px-5"
                >
                  {currentIndex + 1 < roundQuestions.length ? 'Next Question →' : 'See Final Summary →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ============================================================
     STAGE 3: ENCOURAGING ROUND SUMMARY
     ============================================================ */
  const accuracy = roundQuestions.length
    ? Math.round((correctCount / roundQuestions.length) * 100)
    : 0;
  const ratingTitle =
    accuracy >= 90
      ? 'Studio Genius!'
      : accuracy >= 70
        ? 'Awesome Thinking!'
        : accuracy >= 50
          ? 'Solid Progress!'
          : 'Great Practice Run!';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <section className="studio-card p-6 sm:p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-[#2563EB] text-white mx-auto flex items-center justify-center shadow-lg">
          <Trophy size={32} />
        </div>

        <div>
          <div className="font-mono-tech text-xs font-bold uppercase tracking-widest text-[var(--studio-accent-text)]">
            {selectedCategory.name} · Round Complete
          </div>
          <h1 className="font-heading font-bold text-3xl text-[var(--studio-text)] mt-1">
            {ratingTitle}
          </h1>
          {leveledUpBanner && (
            <div className="mt-2 inline-block px-3 py-1 rounded-lg bg-[#D97706] text-white font-mono-tech text-xs font-bold">
              LEVEL UP UNLOCKED!
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          <div className="p-3.5 studio-well">
            <div className="font-mono-tech text-[10px] font-bold text-[var(--studio-text-muted)]">SCORE</div>
            <div className="font-heading font-bold text-2xl text-[var(--studio-emerald-text)] tabular-nums">
              {correctCount} / {roundQuestions.length}
            </div>
          </div>
          <div className="p-3.5 studio-well">
            <div className="font-mono-tech text-[10px] font-bold text-[var(--studio-text-muted)]">ACCURACY</div>
            <div className="font-heading font-bold text-2xl text-[var(--studio-accent-text)] tabular-nums">
              {accuracy}%
            </div>
          </div>
          <div className="p-3.5 studio-well">
            <div className="font-mono-tech text-[10px] font-bold text-[var(--studio-text-muted)]">BEST STREAK</div>
            <div className="font-heading font-bold text-2xl text-[var(--studio-amber-text)] tabular-nums">
              {bestStreak}
            </div>
          </div>
          <div className="p-3.5 studio-well">
            <div className="font-mono-tech text-[10px] font-bold text-[var(--studio-text-muted)]">XP EARNED</div>
            <div className="font-heading font-bold text-2xl text-[var(--studio-purple-text)] tabular-nums">
              +{xpAwarded}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => startRound(selectedCategory, difficultyFilter)}
            className="studio-btn studio-btn-primary text-xs sm:text-sm px-6"
          >
            <RotateCcw size={15} />
            <span>Replay {selectedCategory.shortName}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              setStage('select');
            }}
            className="studio-btn studio-btn-ghost text-xs sm:text-sm px-5"
          >
            Choose Another Category
          </button>
        </div>
      </section>

      <section className="studio-card-solid p-5 sm:p-6 space-y-3">
        <h2 className="font-heading font-bold text-base text-[var(--studio-text)]">Quick Concept Review</h2>
        <div className="space-y-2.5">
          {records.map((rec, i) => (
            <div key={`${rec.question.id}_${i}`} className="p-3.5 rounded-xl studio-well">
              <div className="flex items-start justify-between gap-2 text-xs sm:text-sm font-sora font-bold text-[var(--studio-text)]">
                <span>
                  {i + 1}. {rec.question.question}
                </span>
                <span
                  className={`font-mono-tech text-xs px-2 py-0.5 rounded shrink-0 ${
                    rec.isCorrect ? 'bg-[#059669] text-white' : 'bg-[#DC2626] text-white'
                  }`}
                >
                  {rec.isCorrect ? 'PASS' : 'MISS'}
                </span>
              </div>
              <div className="text-xs text-[var(--studio-accent-text)] font-semibold mt-1">
                Answer: {rec.question.options[rec.question.correctIndex]}
              </div>
              <div className="text-xs text-[var(--studio-text-secondary)] mt-0.5">
                {rec.question.explanation}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
