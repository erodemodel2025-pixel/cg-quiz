import React, { useEffect, useState } from 'react';
import { arcadeAudio } from '../audio/arcadeAudio.ts';
import { useArcade } from '../context/ArcadeContext.tsx';
import { computeExamLevel } from '../../shared/progression.ts';
import type { AnalyticsSummary, ExamSettings } from '../../shared/types.ts';
import { safeFetchJson } from '../utils/apiClient.ts';
import { loadActiveQuizDraft, type ActiveQuizDraft } from '../utils/storageMigration.ts';
import {
  PixelIcon,
  PixelIllustration,
  PixelLogo,
  PixelMascot,
  PixelTorch,
  type PixelIllustrationName,
} from '../components/pixel/PixelArtAssets.tsx';

interface HomePageProps {
  onPlay: () => void;
  onStartExamPreset: (preset: Partial<ExamSettings>) => void;
  onResumeDraft: (draft: ActiveQuizDraft) => void;
  onOpenHowToPlay: () => void;
  onOpenAnalytics: () => void;
  onOpenTrophyRoom?: () => void;
}

const FEATURED_ENGINEERING_BRANCHES: Array<{
  id: string;
  title: string;
  subtitle: string;
  art: PixelIllustrationName;
  accentColor: string;
}> = [
  {
    id: 'cs',
    title: 'Computer Science',
    subtitle: 'Algorithms & systems',
    art: 'computer',
    accentColor: '#00F0FF',
  },
  {
    id: 'electronics',
    title: 'Electronics',
    subtitle: 'Logic gates & circuits',
    art: 'circuit',
    accentColor: '#FACC15',
  },
  {
    id: 'mechanical',
    title: 'Mechanical',
    subtitle: 'Thermo & fluid power',
    art: 'tools',
    accentColor: '#38BDF8',
  },
  {
    id: 'ai',
    title: 'AI & Robotics',
    subtitle: 'Neural nets & control',
    art: 'robot',
    accentColor: '#A855F7',
  },
];

export const HomePage: React.FC<HomePageProps> = ({
  onPlay,
  onStartExamPreset,
  onResumeDraft,
  onOpenHowToPlay,
  onOpenAnalytics,
  onOpenTrophyRoom,
}) => {
  const { examUserId, setMusicMode } = useArcade();

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [draft] = useState(() => loadActiveQuizDraft());

  useEffect(() => {
    setMusicMode('home');
  }, [setMusicMode]);

  useEffect(() => {
    void safeFetchJson<AnalyticsSummary>(
      `/api/exam/analytics?userId=${encodeURIComponent(examUserId)}&range=7d`
    ).then((res) => {
      if (res.ok && res.data) setAnalytics(res.data);
    });
  }, [examUserId]);

  const levelInfo = computeExamLevel(analytics?.streaks.examXp ?? 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-9">
      {/* Crisp Arcade Title-Screen Stage */}
      <section className="exam-card px-6 py-9 sm:px-10 sm:py-11 text-center relative overflow-hidden">
        {/* Corner Pixel Torches */}
        <div className="hidden sm:block absolute top-4 left-5">
          <PixelTorch size={38} />
        </div>
        <div className="hidden sm:block absolute top-4 right-5">
          <PixelTorch size={38} />
        </div>

        <div className="flex flex-col items-center">
          {/* Mascot + Block Title */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <PixelMascot mood="happy" size={84} />
            <PixelLogo variant="hero" />
          </div>

          <h1 className="font-pixel text-sm sm:text-lg text-[var(--voxel-gold)] tracking-wider mb-2">
            THE ENGINEERING ARCADE
          </h1>

          <p className="text-sm sm:text-base text-[var(--exam-text-secondary)] max-w-md mb-7">
            Test your engineering instincts across 12 technical branches and earn crowns in the Grand Trophy Room.
          </p>

          {/* Primary Play Action */}
          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('gameStart');
              onStartExamPreset({ mode: 'quick', questionCount: 10, timeLimitMinutes: 8 });
            }}
            className="exam-btn exam-btn-primary px-9 sm:px-11 py-4 text-sm sm:text-base min-h-[56px]"
          >
            <PixelIcon name="play" size={18} />
            <span>PLAY ENGINEERING QUIZ</span>
          </button>

          {/* Quiet Secondary Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-5 text-xs sm:text-sm font-display-pixel">
            {draft && draft.questions?.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  arcadeAudio.playSfx('click');
                  onResumeDraft(draft);
                }}
                className="text-[var(--voxel-green)] hover:underline cursor-pointer"
              >
                Resume saved quiz ({draft.mode})
              </button>
            )}

            {onOpenTrophyRoom && (
              <button
                type="button"
                onClick={() => {
                  arcadeAudio.playSfx('click');
                  onOpenTrophyRoom();
                }}
                className="text-[var(--voxel-gold)] hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <PixelIcon name="trophy" size={14} /> Grand Trophy Room
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                arcadeAudio.playSfx('click');
                onOpenHowToPlay();
              }}
              className="text-[var(--exam-accent)] hover:underline cursor-pointer"
            >
              How it works
            </button>
          </div>
        </div>
      </section>

      {/* Featured Engineering Branches (Clean 4-Block Row) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-pixel text-xs sm:text-sm text-[var(--exam-text)] tracking-wide">
            PICK AN ENGINEERING BRANCH
          </h2>
          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              onPlay();
            }}
            className="font-display-pixel text-xs sm:text-sm text-[var(--exam-accent)] hover:underline cursor-pointer"
          >
            All 12 branches &amp; modes →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURED_ENGINEERING_BRANCHES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                arcadeAudio.playSfx('click');
                onStartExamPreset({
                  mode: 'quick',
                  categoryId: cat.id,
                  questionCount: 10,
                  timeLimitMinutes: 8,
                });
              }}
              className="voxel-tile p-5 text-left flex sm:flex-col items-center sm:items-start gap-4 sm:gap-3 cursor-pointer group"
            >
              <div
                className="w-14 h-14 border-3 border-[#0B0F1A] flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${cat.accentColor}22` }}
              >
                <PixelIllustration name={cat.art} size={42} />
              </div>

              <div className="min-w-0">
                <div className="font-display-pixel text-sm sm:text-base font-bold text-[var(--exam-text)] group-hover:text-[var(--exam-accent)]">
                  {cat.title}
                </div>
                <p className="text-xs sm:text-sm text-[var(--exam-text-secondary)] mt-0.5">
                  {cat.subtitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Clean One-Line Player Progress Strip */}
      {analytics?.hasData && (
        <div className="exam-card-subtle px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-4 font-display-pixel">
            <span className="flex items-center gap-1.5 text-[var(--voxel-gold)]">
              <PixelIcon name="trophy" size={14} />
              {levelInfo.title}
            </span>
            <span className="flex items-center gap-1.5 text-[var(--voxel-green)]">
              <PixelIcon name="flame" size={14} />
              {analytics.streaks.dailyStreak}d Streak
            </span>
            <span className="text-[var(--exam-text-secondary)] font-code tabular-nums">
              {analytics.overallAccuracy}% Accuracy
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              onOpenAnalytics();
            }}
            className="font-display-pixel text-xs text-[var(--exam-accent)] hover:underline cursor-pointer"
          >
            View Progress →
          </button>
        </div>
      )}
    </div>
  );
};
