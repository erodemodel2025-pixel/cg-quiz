import React, { useRef, useState } from 'react';
import { Menu, Moon, Sun, WifiOff, X } from 'lucide-react';
import { arcadeAudio } from '../audio/arcadeAudio.ts';
import { useArcade } from '../context/ArcadeContext.tsx';

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
  onNavigate: (route: AppRoute) => void;
  onOpenRegister: () => void;
}

const NAV_ITEMS: Array<{ id: AppRoute; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'quiz-studio', label: 'Quizzes' },
  { id: 'bank', label: 'Bank' },
  { id: 'mistakes', label: 'Mistakes' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'arcade', label: 'Arcade' },
];

export const TopNav: React.FC<TopNavProps> = ({ route, onNavigate, onOpenRegister }) => {
  const { player, uiTheme, toggleUiTheme, isOnline, unlockAchievement } = useArcade();
  const [mobileOpen, setMobileOpen] = useState(false);
  const logoClicksRef = useRef(0);

  const isArcadeMode = route === 'arcade';

  const handleLogoClick = () => {
    arcadeAudio.playSfx('click');
    logoClicksRef.current += 1;
    if (logoClicksRef.current >= 5) {
      logoClicksRef.current = 0;
      void unlockAchievement('logo_poke', 'CORE OVERHEAT!');
    }
    onNavigate('home');
    setMobileOpen(false);
  };

  const handleNav = (target: AppRoute) => {
    arcadeAudio.playSfx('click');
    onNavigate(target);
    setMobileOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-40 border-b ${
        isArcadeMode
          ? 'bg-[#04060E] border-b-3 border-[var(--border-pixel)] text-[#F4F7FF]'
          : 'bg-[var(--exam-nav-bg)] border-[var(--exam-border)] text-[var(--exam-text)]'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={handleLogoClick}
          className={`whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2 ${
            isArcadeMode
              ? 'font-pixel text-sm sm:text-base text-[var(--accent-primary)] hover:text-[#FFE600]'
              : 'font-exam font-extrabold text-lg tracking-tight text-[var(--exam-text)]'
          }`}
        >
          <span>CGQUIZ</span>
          {!isOnline && (
            <span
              title="Offline mode — cached data active"
              className="text-[11px] font-medium text-[var(--exam-warning)] flex items-center gap-1"
            >
              <WifiOff size={13} /> Offline
            </span>
          )}
        </button>

        {/* Zone 2: Single-line Nav Links */}
        <nav className="hidden lg:flex items-center gap-5">
          {NAV_ITEMS.map((item) => {
            const active = route === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`text-sm font-semibold whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors cursor-pointer ${
                  isArcadeMode
                    ? active
                      ? 'text-[#FFE600] border-[#FFE600]'
                      : 'text-[#B3C2EB] border-transparent hover:text-white'
                    : active
                      ? 'text-[var(--exam-accent)] border-[var(--exam-accent)]'
                      : 'text-[var(--exam-text-secondary)] border-transparent hover:text-[var(--exam-text)]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Dark/Light Toggle + Profile Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleUiTheme}
            aria-label={uiTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`p-2 rounded-lg border cursor-pointer ${
              isArcadeMode
                ? 'border-[var(--border-pixel)] text-[#DCE8FF] hover:border-[#00F0FF]'
                : 'border-[var(--exam-border-strong)] text-[var(--exam-text-secondary)] hover:text-[var(--exam-text)]'
            }`}
          >
            {uiTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              if (player) {
                onNavigate('profile');
              } else {
                onOpenRegister();
              }
            }}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold max-w-[150px] truncate cursor-pointer whitespace-nowrap ${
              isArcadeMode
                ? 'pixel-btn pixel-btn-cyan text-[10px]'
                : 'bg-[var(--exam-accent)] text-white hover:bg-[var(--exam-accent-hover)]'
            }`}
          >
            {player ? player.name : 'Set Name'}
          </button>

          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              setMobileOpen((v) => !v);
            }}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className={`lg:hidden p-2 rounded-lg border cursor-pointer ${
              isArcadeMode
                ? 'border-[var(--border-pixel)] text-white'
                : 'border-[var(--exam-border-strong)] text-[var(--exam-text)]'
            }`}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className={`lg:hidden border-t px-4 py-3 grid grid-cols-2 gap-2 ${
            isArcadeMode
              ? 'bg-[var(--bg-panel)] border-[var(--border-pixel)]'
              : 'bg-[var(--exam-surface)] border-[var(--exam-border)]'
          }`}
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`text-left text-sm font-semibold py-2.5 px-3 rounded-lg border cursor-pointer ${
                route === item.id
                  ? 'bg-[var(--exam-accent-soft)] border-[var(--exam-accent)] text-[var(--exam-accent)]'
                  : 'border-[var(--exam-border)] text-[var(--exam-text)]'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleNav('profile')}
            className="text-left text-sm font-semibold py-2.5 px-3 rounded-lg border border-[var(--exam-border)] text-[var(--exam-text)] cursor-pointer"
          >
            Profile
          </button>
        </div>
      )}
    </header>
  );
};
