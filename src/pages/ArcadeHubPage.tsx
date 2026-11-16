import React, { useEffect } from 'react';
import {
  BrainCircuit,
  Code2,
  Cpu,
  GraduationCap,
  Play,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react';
import { arcadeAudio } from '../audio/arcadeAudio.ts';
import { useArcade } from '../context/ArcadeContext.tsx';
import type { GameModeId, QuizMode } from '../../shared/types.ts';

interface ArcadeHubPageProps {
  onSelectGame: (game: GameModeId, quizMode?: QuizMode) => void;
}

const ARCADE_GAMES: Array<{
  id: GameModeId;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  btnClass: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  {
    id: 'iq-quiz',
    title: 'ENGINEERING IQ QUIZ',
    subtitle: '12 Disciplines · Practice & Ranked',
    description:
      'Multiple-choice engineering challenges with progressive difficulty, combo streaks, and textbook explanations.',
    color: '#00F0FF',
    btnClass: 'pixel-btn-cyan',
    icon: GraduationCap,
  },
  {
    id: 'circuit-rush',
    title: 'CIRCUIT RUSH',
    subtitle: '2D Pixel Grid · Live Current Flow',
    description:
      'Rotate PCB wire segments and complete energized closed circuits from 5V/12V rails to the load.',
    color: '#FFE600',
    btnClass: 'pixel-btn-yellow',
    icon: Zap,
  },
  {
    id: 'code-breaker',
    title: 'CODE BREAKER',
    subtitle: 'C · C++ · Python · Java · Web · Algos',
    description:
      'Predict program outputs, spot elusive bugs, and analyze algorithmic complexity in a retro terminal.',
    color: '#22FF66',
    btnClass: 'pixel-btn-green',
    icon: Code2,
  },
  {
    id: 'boss-battle',
    title: 'ENGINEERING BOSS BATTLE',
    subtitle: 'Multi-Round · 2x Critical Rounds',
    description:
      'Face the Entropy Golem! Correct answers fire laser damage; mistakes drain your energy shield.',
    color: '#FF6B00',
    btnClass: 'pixel-btn-orange',
    icon: Swords,
  },
  {
    id: 'logic-lab',
    title: 'LOGIC LAB',
    subtitle: 'Boolean Gates · Gears · Math Patterns',
    description:
      'Solve digital logic gate schematics, binary/hex conversions, compound gear trains, and engineering probability.',
    color: '#A855F7',
    btnClass: 'pixel-btn-purple',
    icon: BrainCircuit,
  },
  {
    id: 'component-match',
    title: 'COMPONENT MATCH',
    subtitle: 'Fast Hardware Memory Blitz',
    description:
      'Pair electronic components—resistors, MOSFETs, op-amps, sensors—with their schematic symbols and functions.',
    color: '#00F0FF',
    btnClass: 'pixel-btn-cyan',
    icon: Cpu,
  },
];

export const ArcadeHubPage: React.FC<ArcadeHubPageProps> = ({ onSelectGame }) => {
  const { setMusicMode } = useArcade();

  useEffect(() => {
    setMusicMode('home');
  }, [setMusicMode]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 relative z-10">
      {/* Header + Quick Live Competition Banner */}
      <div className="pixel-panel p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-pixel text-xl sm:text-2xl text-[#FFE600] mb-2">
            SELECT YOUR ARCADE CABINET
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            Every game tracks score, combo streaks, and awards XP toward your engineering rank and pixel themes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            arcadeAudio.playSfx('gameStart');
            onSelectGame('iq-quiz', 'competitive');
          }}
          className="pixel-btn pixel-btn-yellow px-5 py-3.5 text-xs shrink-0"
        >
          <Trophy size={16} /> Enter Live Competition
        </button>
      </div>

      {/* 6 Playable Mini-Game Cabinets */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ARCADE_GAMES.map((game) => {
          const Icon = game.icon;
          return (
            <div
              key={game.id}
              className="pixel-panel p-5 flex flex-col justify-between"
              style={{ borderColor: game.color }}
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div
                    className="w-11 h-11 border-2 border-white flex items-center justify-center text-[#04060E]"
                    style={{ backgroundColor: game.color }}
                  >
                    <Icon size={22} />
                  </div>
                  <span className="font-code text-xs text-[var(--text-muted)]">
                    {game.subtitle}
                  </span>
                </div>

                <h2 className="font-pixel text-xs sm:text-sm mb-2" style={{ color: game.color }}>
                  {game.title}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
                  {game.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  arcadeAudio.playSfx('gameStart');
                  onSelectGame(game.id, 'practice');
                }}
                className={`pixel-btn ${game.btnClass} w-full py-3 text-xs`}
              >
                <Play size={14} fill="currentColor" /> Launch Game
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
