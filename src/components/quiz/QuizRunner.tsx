import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Flag,
  Heart,
  LayoutGrid,
  ShieldAlert,
  Timer,
  X,
} from 'lucide-react';
import { soundManager } from '../../audio/SoundManager.ts';
import { useArcade } from '../../context/ArcadeContext.tsx';
import { saveActiveQuizDraft, updateOfflineCache, readOfflineCache, type ActiveQuizDraft } from '../../utils/storageMigration.ts';
import type {
  ExamAnswerItem,
  ExamDifficulty,
  ExamResultSummary,
  ExamSettings,
  ExamUserAnswer,
  PublicExamQuestion,
  SmartExplanation,
} from '../../../shared/types.ts';
import { QuestionRenderer } from './QuestionRenderer.tsx';
import { SmartExplanationCard } from './SmartExplanationCard.tsx';
import { QuizResultsView } from './QuizResultsView.tsx';

interface QuizRunnerProps {
  initialSettings: ExamSettings;
  customQuestionIds?: string[];
  initialDraft?: ActiveQuizDraft | null;
  onExit: () => void;
  onRetryWrongIds: (wrongIds: string[]) => void;
  onPracticeSimilar: (preset: Partial<ExamSettings>) => void;
  onViewAnalytics: () => void;
}

interface ImmediateCheck {
  correct: boolean;
  correctAnswer: number | number[] | string;
  explanation: SmartExplanation;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({
  initialSettings,
  customQuestionIds,
  initialDraft,
  onExit,
  onRetryWrongIds,
  onPracticeSimilar,
  onViewAnalytics,
}) => {
  const { examUserId, player, bookmarkedIds, toggleBookmark, isOnline, reportError } = useArcade();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState<PublicExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ExamUserAnswer>>({});
  const [markedReview, setMarkedReview] = useState<Record<string, boolean>>({});
  const [timeSpentByQ, setTimeSpentByQ] = useState<Record<string, number>>({});
  const [checkedFeedback, setCheckedFeedback] = useState<Record<string, ImmediateCheck>>({});

  const [adaptiveDiff, setAdaptiveDiff] = useState<ExamDifficulty>('Medium');
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(initialSettings.timeLimitMinutes * 60);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  // Anti-cheat telemetry for Mock / Timed tests
  const [antiCheatNotice, setAntiCheatNotice] = useState<string | null>(null);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResultSummary | null>(null);

  const qEnteredAtRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);

  const isExamMode = initialSettings.mode === 'mock' || initialSettings.mode === 'timed';
  const isImmediateMode = !isExamMode;

  const startSession = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    submittedRef.current = false;
    setResult(null);
    setCheckedFeedback({});
    setAnswers({});
    setMarkedReview({});
    setTimeSpentByQ({});
    setLives(3);
    setTabSwitches(0);
    setFullscreenExits(0);
    setAntiCheatNotice(null);

    try {
      if (!isOnline) {
        const cached = readOfflineCache().questions;
        if (cached.length > 0) {
          const subset = cached.slice(0, Math.min(initialSettings.questionCount || 10, cached.length));
          setSessionId(`offline_${Date.now()}`);
          setQuestions(subset);
          setTimeLeft(initialSettings.timeLimitMinutes * 60);
          setCurrentIndex(0);
          qEnteredAtRef.current = Date.now();
          setLoading(false);
          return;
        }
        throw new Error('You are currently offline and no cached questions are available.');
      }

      const res = await fetch('/api/exam/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: examUserId,
          displayName: player?.name,
          ...initialSettings,
          questionIds: customQuestionIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not start quiz session.');
      }

      soundManager.playGameStart();
      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setTimeLeft(data.timeLimitSeconds || initialSettings.timeLimitMinutes * 60);
      setAdaptiveDiff(data.adaptiveState?.currentDifficulty || 'Medium');
      setCurrentIndex(0);
      qEnteredAtRef.current = Date.now();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to start quiz.';
      setErrorMsg(msg);
      reportError(msg);
    } finally {
      setLoading(false);
    }
  }, [customQuestionIds, examUserId, initialSettings, isOnline, player?.name, reportError]);

  useEffect(() => {
    if (initialDraft && initialDraft.questions?.length > 0 && initialDraft.sessionId) {
      setSessionId(initialDraft.sessionId);
      setQuestions(initialDraft.questions);
      setCurrentIndex(Math.min(initialDraft.currentIndex || 0, initialDraft.questions.length - 1));
      setAnswers(initialDraft.answers || {});
      const revMap: Record<string, boolean> = {};
      for (const id of initialDraft.markedReview || []) revMap[id] = true;
      setMarkedReview(revMap);
      setTimeLeft(Math.max(30, initialDraft.timeLeftSeconds || 300));
      qEnteredAtRef.current = Date.now();
      setLoading(false);
      return;
    }
    void startSession();
  }, [initialDraft, startSession]);

  // Persist active draft locally for "Continue Quiz"
  useEffect(() => {
    if (!sessionId || result || questions.length === 0) return;
    saveActiveQuizDraft({
      mode: initialSettings.mode,
      settings: initialSettings,
      sessionId,
      questions,
      currentIndex,
      answers,
      markedReview: Object.keys(markedReview).filter((k) => markedReview[k]),
      timeLeftSeconds: timeLeft,
      savedAt: new Date().toISOString(),
    });
  }, [answers, currentIndex, initialSettings, markedReview, questions, result, sessionId, timeLeft]);

  const recordQuestionTime = useCallback(() => {
    const q = questions[currentIndex];
    if (!q) return timeSpentByQ;
    const delta = Math.max(500, Date.now() - qEnteredAtRef.current);
    qEnteredAtRef.current = Date.now();
    const updated = { ...timeSpentByQ, [q.id]: (timeSpentByQ[q.id] || 0) + delta };
    setTimeSpentByQ(updated);
    return updated;
  }, [currentIndex, questions, timeSpentByQ]);

  const submitQuiz = useCallback(
    async (finalTimes?: Record<string, number>) => {
      if (submittedRef.current || questions.length === 0) return;
      submittedRef.current = true;
      setSubmitting(true);
      setConfirmSubmitOpen(false);

      const timingMap = finalTimes || recordQuestionTime();
      const payloadAnswers: ExamAnswerItem[] = questions.map((q) => ({
        questionId: q.id,
        userAnswer: answers[q.id] ?? null,
        timeMs: timingMap[q.id] || 8000,
        markedForReview: Boolean(markedReview[q.id]),
      }));

      try {
        const res = await fetch('/api/exam/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userId: examUserId,
            displayName: player?.name,
            answers: payloadAnswers,
            antiCheat: { tabSwitches, fullscreenExits },
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Submission failed.');
        }

        saveActiveQuizDraft(null);
        const cache = readOfflineCache();
        updateOfflineCache({
          historyResults: { ...cache.historyResults, [data.attemptId]: data },
        });
        soundManager.playVictory();
        setResult(data);
      } catch (err) {
        submittedRef.current = false;
        const msg = err instanceof Error ? err.message : 'Unable to submit quiz.';
        setErrorMsg(msg);
        reportError(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [
      answers,
      examUserId,
      fullscreenExits,
      markedReview,
      player?.name,
      questions,
      recordQuestionTime,
      reportError,
      sessionId,
      tabSwitches,
    ]
  );

  // Countdown Timer
  useEffect(() => {
    if (loading || result || questions.length === 0) return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          void submitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [loading, questions.length, result, submitQuiz]);

  // Mock Test Anti-Cheat: beforeunload + visibilitychange + fullscreenchange
  useEffect(() => {
    if (loading || result || !isExamMode) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const onVisibility = () => {
      if (document.hidden) {
        setTabSwitches((c) => {
          const next = c + 1;
          setAntiCheatNotice(`Tab switch detected (${next}). Stay inside the exam window.`);
          return next;
        });
      }
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenExits((c) => c + 1);
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [isExamMode, loading, result]);

  const currentQ = questions[currentIndex];
  const currentCheck = currentQ ? checkedFeedback[currentQ.id] : undefined;

  const handleCheckAnswer = async () => {
    if (!currentQ || !isImmediateMode || currentCheck) return;
    const userAns = answers[currentQ.id] ?? null;
    if (
      userAns === null ||
      userAns === '' ||
      (Array.isArray(userAns) && userAns.length === 0)
    ) {
      return;
    }

    const updatedTimes = recordQuestionTime();
    try {
      const res = await fetch('/api/exam/check-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: currentQ.id,
          userAnswer: userAns,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        reportError(data.error || 'Answer check failed');
        return;
      }

      setCheckedFeedback((prev) => ({
        ...prev,
        [currentQ.id]: {
          correct: data.correct,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation,
        },
      }));

      if (data.adaptiveState?.currentDifficulty) {
        setAdaptiveDiff(data.adaptiveState.currentDifficulty);
      }

      if (data.correct) {
        soundManager.playCorrect();
      } else {
        soundManager.playWrong();
        if (initialSettings.mode === 'survival') {
          const remaining = lives - 1;
          setLives(remaining);
          if (remaining <= 0) {
            void submitQuiz(updatedTimes);
          }
        }
      }
    } catch (err) {
      reportError(String(err));
    }
  };

  const goToQuestion = (nextIdx: number) => {
    if (nextIdx < 0 || nextIdx >= questions.length) return;
    recordQuestionTime();
    setCurrentIndex(nextIdx);
    setPaletteOpen(false);
  };

  // Keyboard shortcuts (ArrowLeft / ArrowRight)
  useEffect(() => {
    if (loading || result) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowRight' && currentIndex + 1 < questions.length) {
        goToQuestion(currentIndex + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        goToQuestion(currentIndex - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, loading, questions.length, result]);

  if (result) {
    return (
      <QuizResultsView
        result={result}
        onRetryWrong={(wrongIds) => onRetryWrongIds(wrongIds)}
        onPracticeSimilar={onPracticeSimilar}
        onBackToStudio={onExit}
        onViewAnalytics={onViewAnalytics}
      />
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="exam-card p-8 text-center">
          <div className="text-sm font-semibold text-[var(--exam-text-muted)]">
            Preparing your quiz session...
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg || !currentQ) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="exam-card p-6 sm:p-8 text-center">
          <AlertTriangle size={34} className="mx-auto text-[var(--exam-warning)] mb-3" />
          <h2 className="text-lg font-bold text-[var(--exam-text)] mb-2">
            {errorMsg || 'Unable to load questions for this selection.'}
          </h2>
          <p className="text-sm text-[var(--exam-text-secondary)] mb-5">
            Adjust your filters or try another mode.
          </p>
          <div className="flex justify-center gap-3">
            <button type="button" onClick={() => void startSession()} className="exam-btn exam-btn-primary text-sm">
              Retry
            </button>
            <button type="button" onClick={onExit} className="exam-btn exam-btn-secondary text-sm">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    if (a === null || a === undefined || a === '') return false;
    if (Array.isArray(a)) return a.length > 0 && a.every((v) => v >= 0);
    return true;
  }).length;

  const progressPct = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-28 sm:pb-10">
      {/* Top Quiz / Exam HUD Bar */}
      <div className="exam-card p-3.5 sm:p-4 mb-4 flex flex-wrap items-center justify-between gap-3 sticky top-16 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit quiz"
            className="p-2 rounded-md border border-[var(--exam-border-strong)] text-[var(--exam-text-secondary)] hover:text-[var(--exam-text)] cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--exam-accent)]">
              {initialSettings.mode === 'mock' ? 'MOCK EXAM HALL' : `${initialSettings.mode.toUpperCase()} QUIZ`}
              {initialSettings.difficulty === 'Adaptive' ? ` · Adaptive (${adaptiveDiff})` : ''}
            </div>
            <div className="text-sm font-bold text-[var(--exam-text)] font-code tabular-nums">
              Question {currentIndex + 1} / {questions.length} · {answeredCount} Answered
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {initialSettings.mode === 'survival' && (
            <div className="flex items-center gap-1 text-[var(--exam-danger)] font-code text-sm font-bold">
              {[0, 1, 2].map((i) => (
                <Heart
                  key={i}
                  size={16}
                  fill={i < lives ? 'currentColor' : 'none'}
                  className={i < lives ? '' : 'opacity-30'}
                />
              ))}
            </div>
          )}

          <div
            className={`px-3 py-1.5 rounded-md border font-code text-sm font-bold flex items-center gap-1.5 tabular-nums ${
              timeLeft <= 60
                ? 'bg-[var(--exam-danger-soft)] border-[var(--exam-danger)] text-[var(--exam-danger)]'
                : 'bg-[var(--exam-surface-alt)] border-[var(--exam-border-strong)] text-[var(--exam-text)]'
            }`}
          >
            <Timer size={15} /> {formatTimer(timeLeft)}
          </div>

          {isExamMode && (
            <button
              type="button"
              onClick={() => setPaletteOpen((v) => !v)}
              className="lg:hidden exam-btn exam-btn-secondary px-3 py-2 text-xs min-h-[38px]"
            >
              <LayoutGrid size={15} /> Palette
            </button>
          )}

          <button
            type="button"
            onClick={() => setConfirmSubmitOpen(true)}
            disabled={submitting}
            className="exam-btn exam-btn-primary px-4 py-2 text-xs sm:text-sm min-h-[38px]"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-[var(--exam-surface-alt)] rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-[var(--exam-accent)] transition-all duration-200"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Anti-Cheat Notice (Mock/Timed) */}
      {antiCheatNotice && isExamMode && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-[var(--exam-warning-soft)] border border-[var(--exam-warning)] text-xs sm:text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-medium text-[var(--exam-text)]">
            <ShieldAlert size={16} className="text-[var(--exam-warning)] shrink-0" />
            {antiCheatNotice}
          </span>
          <button
            type="button"
            onClick={() => setAntiCheatNotice(null)}
            className="text-[var(--exam-text-muted)] cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Main Split Workspace: Question on left + Optional Mock Question Palette on right */}
      <div className={`grid gap-6 ${isExamMode ? 'lg:grid-cols-[1fr_280px]' : ''}`}>
        <div className="space-y-4">
          <QuestionRenderer
            question={currentQ}
            userAnswer={answers[currentQ.id] ?? null}
            onChangeAnswer={(val) => {
              if (currentCheck) return;
              setAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
            }}
            disabled={Boolean(currentCheck)}
            revealCorrectAnswer={currentCheck ? currentCheck.correctAnswer : null}
            isBookmarked={bookmarkedIds.includes(currentQ.id)}
            onToggleBookmark={() => void toggleBookmark(currentQ.id)}
          />

          {/* Immediate Feedback Check Action */}
          {isImmediateMode && !currentCheck && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setMarkedReview((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))
                }
                className={`exam-btn exam-btn-secondary text-xs sm:text-sm ${
                  markedReview[currentQ.id] ? 'border-[var(--exam-warning)] text-[var(--exam-warning)]' : ''
                }`}
              >
                <Flag size={15} />
                {markedReview[currentQ.id] ? 'Marked for Review' : 'Mark for Review'}
              </button>

              <button
                type="button"
                onClick={() => void handleCheckAnswer()}
                disabled={
                  answers[currentQ.id] === undefined ||
                  answers[currentQ.id] === null ||
                  answers[currentQ.id] === '' ||
                  (Array.isArray(answers[currentQ.id]) &&
                    (answers[currentQ.id] as number[]).length === 0)
                }
                className="exam-btn exam-btn-primary text-sm px-6"
              >
                <CheckCircle2 size={16} /> Check Answer
              </button>
            </div>
          )}

          {/* Smart Explanation Card (ONLY after submission/check in immediate modes) */}
          {currentCheck && (
            <SmartExplanationCard
              isCorrect={currentCheck.correct}
              questionType={currentQ.questionType}
              options={currentQ.options}
              matchRight={currentQ.matchPairs?.right}
              userAnswer={answers[currentQ.id] ?? null}
              correctAnswer={currentCheck.correctAnswer}
              explanation={currentCheck.explanation}
              defaultExpanded
            />
          )}

          {/* Desktop Navigation Row */}
          <div className="hidden sm:flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => goToQuestion(currentIndex - 1)}
              className="exam-btn exam-btn-secondary text-sm"
            >
              <ArrowLeft size={16} /> Previous
            </button>

            <div className="flex items-center gap-3">
              {isExamMode && (
                <button
                  type="button"
                  onClick={() =>
                    setMarkedReview((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))
                  }
                  className={`exam-btn exam-btn-secondary text-sm ${
                    markedReview[currentQ.id]
                      ? 'border-[var(--exam-warning)] text-[var(--exam-warning)]'
                      : ''
                  }`}
                >
                  <Flag size={15} />
                  {markedReview[currentQ.id] ? 'Marked' : 'Mark for Review'}
                </button>
              )}

              {currentIndex + 1 < questions.length ? (
                <button
                  type="button"
                  onClick={() => goToQuestion(currentIndex + 1)}
                  className="exam-btn exam-btn-primary text-sm"
                >
                  Next <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmSubmitOpen(true)}
                  className="exam-btn exam-btn-primary text-sm"
                >
                  Finish & Review
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mock / Timed Exam Question Palette */}
        {isExamMode && (
          <aside className={`${paletteOpen ? 'block' : 'hidden'} lg:block`}>
            <div className="exam-card p-4 sticky top-36">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--exam-text-muted)] mb-3">
                Question Palette
              </div>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {questions.map((q, idx) => {
                  const ans = answers[q.id];
                  const isAns =
                    ans !== undefined &&
                    ans !== null &&
                    ans !== '' &&
                    (!Array.isArray(ans) || (ans.length > 0 && ans.every((v) => v >= 0)));
                  const isRev = Boolean(markedReview[q.id]);
                  const isCurr = idx === currentIndex;

                  let cls =
                    'bg-[var(--exam-surface-alt)] border-[var(--exam-border-strong)] text-[var(--exam-text-secondary)]';
                  if (isRev) {
                    cls =
                      'bg-[var(--exam-warning-soft)] border-[var(--exam-warning)] text-[var(--exam-warning)]';
                  } else if (isAns) {
                    cls =
                      'bg-[var(--exam-success-soft)] border-[var(--exam-success)] text-[var(--exam-success)]';
                  }
                  if (isCurr) {
                    cls += ' ring-2 ring-[var(--exam-accent)]';
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => goToQuestion(idx)}
                      className={`h-10 rounded-md border font-code text-xs font-bold cursor-pointer ${cls}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1.5 text-xs text-[var(--exam-text-muted)] border-t border-[var(--exam-border)] pt-3">
                <div>Green = Answered · Amber = Review · Gray = Unvisited</div>
                {initialSettings.negativeMarking > 0 && (
                  <div className="text-[var(--exam-warning)] font-medium">
                    Marking: +4 correct / −{initialSettings.negativeMarking} wrong
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Mobile Sticky Bottom Controls */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--exam-surface)] border-t border-[var(--exam-border)] px-3 py-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => goToQuestion(currentIndex - 1)}
          className="exam-btn exam-btn-secondary px-3 text-xs flex-1"
        >
          <ArrowLeft size={14} /> Prev
        </button>

        <button
          type="button"
          onClick={() =>
            setMarkedReview((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))
          }
          className={`exam-btn exam-btn-secondary px-3 text-xs ${
            markedReview[currentQ.id] ? 'border-[var(--exam-warning)] text-[var(--exam-warning)]' : ''
          }`}
          aria-label="Mark for review"
        >
          <Flag size={14} />
        </button>

        {currentIndex + 1 < questions.length ? (
          <button
            type="button"
            onClick={() => goToQuestion(currentIndex + 1)}
            className="exam-btn exam-btn-primary px-4 text-xs flex-1"
          >
            Next <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmSubmitOpen(true)}
            className="exam-btn exam-btn-primary px-4 text-xs flex-1"
          >
            Submit
          </button>
        )}
      </div>

      {/* Submit Confirmation Modal */}
      {confirmSubmitOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setConfirmSubmitOpen(false)}
        >
          <div
            className="exam-card max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-bold text-[var(--exam-text)]">Submit Quiz?</h3>
            <p className="text-sm text-[var(--exam-text-secondary)]">
              You have answered <strong>{answeredCount}</strong> of{' '}
              <strong>{questions.length}</strong> questions.
              {questions.length - answeredCount > 0
                ? ` ${questions.length - answeredCount} question(s) are unanswered.`
                : ''}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSubmitOpen(false)}
                className="exam-btn exam-btn-secondary flex-1 text-sm"
              >
                Continue Quiz
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitQuiz()}
                className="exam-btn exam-btn-primary flex-1 text-sm"
              >
                {submitting ? 'Grading...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
