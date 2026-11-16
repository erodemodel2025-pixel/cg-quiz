import React, { useEffect, useRef, useState } from 'react';
import { arcadeAudio } from '../audio/arcadeAudio.ts';
import { useArcade } from '../context/ArcadeContext.tsx';
import { PixelIcon, PixelLogo } from './pixel/PixelArtAssets.tsx';

export type AppRoute =
  | 'home'
  | 'quiz-studio'
  | 'bank'
  | 'mistakes'
  | 'analytics'
  | 'leaderboard'
  | 'arcade'
  | 'profile'
  | 'admin';

interface TopNavProps {
  route: AppRoute;
  inActiveQuiz?: boolean;
  onNavigate: (route: AppRoute) => void;
  onQuickPlay: () => void;
  onOpenRegister: () => void;
  onOpenHowToPlay: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  route,
  inActiveQuiz = false,
  onNavigate,
  onQuickPlay,
  onOpenRegister,
  onOpenHowToPlay,
}) => {
  const {
    player,
    uiTheme,
    toggleUiTheme,
    soundEnabled,
    toggleSound,
    reducedMotion,
    toggleReducedMotion,
    isOnline,
    unlockAchievement,
  } = useArcade();

  const [menuOpen, setMenuOpen] = useState(false);
  const logoClicksRef = useRef(0);
  const menuWrapRef = useRef<HTMLDivElement>(null);

  const isArcadeMode = route === 'arcade';

  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('mousedown', onOutside);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onOutside);
      window.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  const handleLogoClick = () => {
    arcadeAudio.playSfx('click');
    logoClicksRef.current += 1;
    if (logoClicksRef.current >= 5) {
      logoClicksRef.current = 0;
      void unlockAchievement('logo_poke', 'CORE OVERHEAT!');
    }
    onNavigate('home');
    setMenuOpen(false);
  };

  const handleNav = (target: AppRoute) => {
    arcadeAudio.playSfx('click');
    onNavigate(target);
    setMenuOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-40 border-b-3 ${
        isArcadeMode
          ? 'bg-[#04060E] border-[var(--border-pixel)] text-[#F4F7FF]'
          : 'bg-[var(--exam-nav-bg)] border-[var(--exam-border)] text-[var(--exam-text)]'
      }`}
    >
      <div
        ref={menuWrapRef}
        className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 relative"
      >
        {/* LOGO */}
        <button
          type="button"
          onClick={handleLogoClick}
          className="cursor-pointer flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-[var(--voxel-gold)]"
          aria-label="CG QUIZ Home"
        >
          <span className="sm:hidden">
            <PixelLogo variant="mobile" />
          </span>
          <span className="hidden sm:inline-flex">
            <PixelLogo variant="desktop" />
          </span>
          {!isOnline && (
            <span
              title="Offline mode — cached questions active"
              className="font-display-pixel text-[10px] px-1.5 py-0.5 bg-[var(--exam-warning-soft)] border-2 border-[var(--exam-warning)] text-[var(--exam-warning)]"
            >
              OFFLINE
            </span>
          )}
        </button>

        {/* Minimal Navigation: Desktop = PLAY · CATEGORIES · SCORES · MENU | Mobile = PLAY · MENU */}
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Main navigation">
          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              setMenuOpen(false);
              onQuickPlay();
            }}
            className="exam-btn exam-btn-primary text-xs sm:text-sm px-3.5 sm:px-4 min-h-[40px]"
          >
            <PixelIcon name="play" size={14} />
            <span>PLAY</span>
          </button>

          <button
            type="button"
            onClick={() => handleNav('quiz-studio')}
            className={`hidden md:inline-flex exam-btn text-xs sm:text-sm px-3.5 min-h-[40px] ${
              !inActiveQuiz && route === 'quiz-studio'
                ? 'exam-btn-gold'
                : 'exam-btn-secondary'
            }`}
          >
            CATEGORIES
          </button>

          <button
            type="button"
            onClick={() => handleNav('leaderboard')}
            className={`hidden md:inline-flex exam-btn text-xs sm:text-sm px-3.5 min-h-[40px] ${
              route === 'leaderboard' ? 'exam-btn-gold' : 'exam-btn-secondary'
            }`}
          >
            SCORES
          </button>

          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              setMenuOpen((v) => !v);
            }}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className={`exam-btn text-xs sm:text-sm px-3 sm:px-3.5 min-h-[40px] ${
              menuOpen ? 'exam-btn-gold' : 'exam-btn-secondary'
            }`}
          >
            <PixelIcon name={menuOpen ? 'close' : 'menu'} size={15} />
            <span>MENU</span>
          </button>
        </nav>

        {/* Single Clean Game Menu Drawer */}
        {menuOpen && (
          <div
            className={`absolute right-4 sm:right-6 top-[calc(100%+6px)] w-[min(92vw,320px)] p-4 z-50 space-y-3 ${
              isArcadeMode
                ? 'pixel-panel bg-[#111833]'
                : 'exam-card bg-[var(--exam-surface)]'
            }`}
            role="menu"
          >
            {/* Player Identity */}
            <div className="exam-card-subtle p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-display-pixel text-[10px] uppercase text-[var(--exam-text-muted)]">
                  PLAYER
                </div>
                <div className="font-display-pixel text-xs sm:text-sm font-bold text-[var(--exam-text)] truncate">
                  {player ? player.name : 'Guest Adventurer'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  arcadeAudio.playSfx('click');
                  setMenuOpen(false);
                  if (player) {
                    onNavigate('profile');
                  } else {
                    onOpenRegister();
                  }
                }}
                className="exam-btn exam-btn-secondary text-xs px-3 py-1.5 min-h-[36px]"
              >
                {player ? 'Profile' : 'Set Name'}
              </button>
            </div>

            {/* Menu Destinations */}
            <div className="grid grid-cols-1 gap-1.5">
              {(
                [
                  { id: 'quiz-studio', label: 'All Categories & Modes', icon: 'quiz' },
                  { id: 'leaderboard', label: 'Scores & Rankings', icon: 'trophy' },
                  { id: 'mistakes', label: 'My Mistakes & Saved', icon: 'bookmark' },
                  { id: 'bank', label: 'Question Bank', icon: 'book' },
                  { id: 'analytics', label: 'My Progress & History', icon: 'score' },
                  { id: 'arcade', label: 'Arcade Mini-Games', icon: 'arcade' },
                ] as const
              ).map((item) => {
                const active = route === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onClick={() => handleNav(item.id)}
                    className={`w-full text-left px-3 py-2.5 border-2 font-display-pixel text-xs flex items-center gap-2.5 cursor-pointer transition-colors ${
                      active
                        ? 'bg-[var(--exam-accent-soft)] border-[var(--exam-accent)] text-[var(--exam-accent)]'
                        : 'bg-[var(--exam-surface-alt)] border-[var(--exam-border)] text-[var(--exam-text)] hover:border-[var(--exam-accent)]'
                    }`}
                  >
                    <PixelIcon name={item.icon} size={15} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  arcadeAudio.playSfx('click');
                  setMenuOpen(false);
                  onOpenHowToPlay();
                }}
                className="w-full text-left px-3 py-2.5 border-2 bg-[var(--exam-surface-alt)] border-[var(--exam-border)] text-[var(--exam-text)] hover:border-[var(--exam-accent)] font-display-pixel text-xs flex items-center gap-2.5 cursor-pointer"
              >
                <PixelIcon name="question" size={15} />
                <span>How to Play</span>
              </button>
            </div>

            {/* Compact Game Settings Row */}
            <div className="pt-2 border-t-2 border-[var(--exam-border)] grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => toggleSound()}
                className="exam-card-subtle py-2 px-2 flex flex-col items-center justify-center gap-1 text-[10px] font-display-pixel cursor-pointer hover:border-[var(--exam-accent)]"
                aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
              >
                <PixelIcon name={soundEnabled ? 'sound-on' : 'sound-off'} size={15} />
                <span>{soundEnabled ? 'SFX ON' : 'MUTED'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  arcadeAudio.playSfx('click');
                  toggleUiTheme();
                }}
                className="exam-card-subtle py-2 px-2 flex flex-col items-center justify-center gap-1 text-[10px] font-display-pixel cursor-pointer hover:border-[var(--exam-accent)]"
                aria-label={uiTheme === 'dark' ? 'Switch to light sky' : 'Switch to dark sky'}
              >
                <PixelIcon name={uiTheme === 'dark' ? 'sun' : 'moon'} size={15} />
                <span>{uiTheme === 'dark' ? 'DAY' : 'NIGHT'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  arcadeAudio.playSfx('click');
                  toggleReducedMotion();
                }}
                className="exam-card-subtle py-2 px-2 flex flex-col items-center justify-center gap-1 text-[10px] font-display-pixel cursor-pointer hover:border-[var(--exam-accent)]"
                aria-label="Toggle calm motion"
              >
                <PixelIcon name="settings" size={15} />
                <span>{reducedMotion ? 'CALM' : 'MOTION'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
