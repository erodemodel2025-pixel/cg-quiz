import React, { useState } from 'react';
import { ArcadeProvider, useArcade } from './context/ArcadeContext.tsx';
import { PixelWorldCanvas } from './components/PixelWorldCanvas.tsx';
import { TopNav, type AppRoute } from './components/TopNav.tsx';
import { RegisterModal } from './components/RegisterModal.tsx';
import { PixelCelebration } from './components/PixelCelebration.tsx';
import { DevConsoleModal } from './components/DevConsoleModal.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { QuizStudioPage } from './pages/QuizStudioPage.tsx';
import { QuestionBankPage } from './pages/QuestionBankPage.tsx';
import { MistakesPage } from './pages/MistakesPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { ArcadeHubPage } from './pages/ArcadeHubPage.tsx';
import { LeaderboardPage } from './pages/LeaderboardPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { AdminQuestionsPage } from './pages/AdminQuestionsPage.tsx';
import { QuizRunner } from './components/quiz/QuizRunner.tsx';
import { EngineeringIQQuiz } from './components/games/EngineeringIQQuiz.tsx';
import { CircuitRushGame } from './components/games/CircuitRushGame.tsx';
import { CodeBreakerGame } from './components/games/CodeBreakerGame.tsx';
import { BossBattleGame } from './components/games/BossBattleGame.tsx';
import { LogicLabGame } from './components/games/LogicLabGame.tsx';
import { ComponentMatchGame } from './components/games/ComponentMatchGame.tsx';
import type { ExamSettings, GameModeId, QuizMode } from '../shared/types.ts';
import type { ActiveQuizDraft } from './utils/storageMigration.ts';

const DEFAULT_SETTINGS: ExamSettings = {
  mode: 'quick',
  categoryId: 'all',
  subject: 'all',
  chapter: 'all',
  difficulty: 'Adaptive',
  questionType: 'All',
  questionCount: 10,
  timeLimitMinutes: 8,
  negativeMarking: 0,
};

function ArcadeShell() {
  const { reportError } = useArcade();
  const [route, setRoute] = useState<AppRoute>('home');
  const [activeGame, setActiveGame] = useState<GameModeId | null>(null);
  const [iqMode, setIqMode] = useState<QuizMode>('practice');
  const [activeExamSettings, setActiveExamSettings] = useState<ExamSettings | null>(null);
  const [customExamQuestionIds, setCustomExamQuestionIds] = useState<string[] | undefined>(undefined);
  const [resumedDraft, setResumedDraft] = useState<ActiveQuizDraft | null>(null);
  const [examRunKey, setExamRunKey] = useState(0);
  const [studioPreset, setStudioPreset] = useState<Partial<ExamSettings> | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);

  const navigate = (next: AppRoute) => {
    setActiveGame(null);
    setActiveExamSettings(null);
    setCustomExamQuestionIds(undefined);
    setResumedDraft(null);
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const launchGame = (game: GameModeId, mode: QuizMode = 'practice') => {
    setActiveExamSettings(null);
    setResumedDraft(null);
    setIqMode(mode);
    setRoute('arcade');
    setActiveGame(game);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const startExamQuiz = (preset: Partial<ExamSettings> = {}, customIds?: string[]) => {
    setActiveGame(null);
    setResumedDraft(null);
    setCustomExamQuestionIds(customIds);
    setActiveExamSettings({
      ...DEFAULT_SETTINGS,
      ...preset,
    });
    setExamRunKey((k) => k + 1);
    setRoute('quiz-studio');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const resumeExamDraft = (draft: ActiveQuizDraft) => {
    setActiveGame(null);
    setCustomExamQuestionIds(undefined);
    setResumedDraft(draft);
    setActiveExamSettings(draft.settings);
    setExamRunKey((k) => k + 1);
    setRoute('quiz-studio');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const isArcadeSurface = route === 'arcade' || Boolean(activeGame);

  return (
    <div
      className={`min-h-screen flex flex-col relative ${
        isArcadeSurface
          ? 'arcade-surface bg-[var(--bg-canvas)] text-[var(--text-primary)]'
          : 'bg-[var(--exam-bg)] text-[var(--exam-text)]'
      }`}
    >
      {isArcadeSurface && <PixelWorldCanvas />}

      <TopNav
        route={route}
        onNavigate={navigate}
        onOpenRegister={() => setRegisterOpen(true)}
      />

      <main className="flex-1 relative z-10 pb-10">
        <ErrorBoundary onGoHome={() => navigate('home')} onReportError={reportError}>
          {activeGame ? (
            <>
              {activeGame === 'iq-quiz' && (
                <EngineeringIQQuiz
                  initialMode={iqMode}
                  onExit={() => setActiveGame(null)}
                  onRequireRegister={() => setRegisterOpen(true)}
                />
              )}
              {activeGame === 'circuit-rush' && (
                <CircuitRushGame onExit={() => setActiveGame(null)} />
              )}
              {activeGame === 'code-breaker' && (
                <CodeBreakerGame onExit={() => setActiveGame(null)} />
              )}
              {activeGame === 'boss-battle' && (
                <BossBattleGame onExit={() => setActiveGame(null)} />
              )}
              {activeGame === 'logic-lab' && (
                <LogicLabGame onExit={() => setActiveGame(null)} />
              )}
              {activeGame === 'component-match' && (
                <ComponentMatchGame onExit={() => setActiveGame(null)} />
              )}
            </>
          ) : activeExamSettings ? (
            <QuizRunner
              key={examRunKey}
              initialSettings={activeExamSettings}
              customQuestionIds={customExamQuestionIds}
              initialDraft={resumedDraft}
              onExit={() => {
                setActiveExamSettings(null);
                setCustomExamQuestionIds(undefined);
                setResumedDraft(null);
              }}
              onRetryWrongIds={(wrongIds) =>
                startExamQuiz({ mode: 'revision', questionCount: wrongIds.length }, wrongIds)
              }
              onPracticeSimilar={(preset) => startExamQuiz(preset)}
              onViewAnalytics={() => navigate('analytics')}
            />
          ) : (
            <>
              {route === 'home' && (
                <HomePage
                  onPlay={() => navigate('quiz-studio')}
                  onStartExamPreset={(preset) => startExamQuiz(preset)}
                  onResumeDraft={(draft) => resumeExamDraft(draft)}
                  onOpenMistakes={() => navigate('mistakes')}
                  onOpenAnalytics={() => navigate('analytics')}
                  onLaunchGame={(g) => launchGame(g, 'practice')}
                  onLeaderboard={() => navigate('leaderboard')}
                  onOpenRegister={() => setRegisterOpen(true)}
                />
              )}
              {route === 'quiz-studio' && (
                <QuizStudioPage
                  initialPreset={studioPreset}
                  onStartQuiz={(settings) => startExamQuiz(settings)}
                  onOpenArcade={() => navigate('arcade')}
                />
              )}
              {route === 'bank' && (
                <QuestionBankPage
                  onPracticeQuestions={(ids, preset) =>
                    startExamQuiz({ mode: 'practice', questionCount: ids.length, ...preset }, ids)
                  }
                />
              )}
              {route === 'mistakes' && (
                <MistakesPage
                  onStartRevision={(ids, preset) =>
                    startExamQuiz(
                      { mode: preset?.mode || 'revision', questionCount: ids.length || 10, ...preset },
                      ids.length > 0 ? ids : undefined
                    )
                  }
                />
              )}
              {route === 'analytics' && (
                <AnalyticsPage
                  onStartQuiz={(preset, ids) => {
                    if (preset && !ids) {
                      setStudioPreset(preset);
                    }
                    startExamQuiz(preset || { mode: 'quick' }, ids);
                  }}
                />
              )}
              {route === 'arcade' && (
                <ArcadeHubPage onSelectGame={(g, m) => launchGame(g, m)} />
              )}
              {route === 'leaderboard' && (
                <LeaderboardPage onPlayCompete={() => startExamQuiz({ mode: 'quick' })} />
              )}
              {route === 'profile' && (
                <ProfilePage
                  onOpenRegister={() => setRegisterOpen(true)}
                  onPlay={() => navigate('quiz-studio')}
                />
              )}
              {route === 'admin' && (
                <AdminQuestionsPage onBack={() => navigate('home')} />
              )}
            </>
          )}
        </ErrorBoundary>
      </main>

      <footer
        className={`relative z-10 border-t py-4 px-4 text-center text-xs ${
          isArcadeSurface
            ? 'border-t-2 border-[var(--border-pixel)] bg-[#04060E] font-code text-[var(--text-muted)]'
            : 'border-[var(--exam-border)] bg-[var(--exam-surface)] text-[var(--exam-text-muted)]'
        }`}
      >
        CGQUIZ · Competitive Quiz Platform & Engineering Arcade
      </footer>

      <RegisterModal open={registerOpen} onClose={() => setRegisterOpen(false)} />

      <PixelCelebration onTriggerDevMode={() => setDevOpen(true)} />

      <DevConsoleModal
        open={devOpen}
        onClose={() => setDevOpen(false)}
        onJumpGame={(g) => launchGame(g, 'practice')}
        onOpenAdmin={() => navigate('admin')}
      />
    </div>
  );
}

export default function App() {
  return (
    <ArcadeProvider>
      <ArcadeShell />
    </ArcadeProvider>
  );
}
