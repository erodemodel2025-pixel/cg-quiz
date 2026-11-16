import React, { useState } from 'react';
import { AlertTriangle, UserPlus, X } from 'lucide-react';
import { arcadeAudio } from '../audio/arcadeAudio.ts';
import { useArcade } from '../context/ArcadeContext.tsx';
import { CLASS_OPTIONS, type ClassOption } from '../../shared/types.ts';

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  subtitle?: string;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  open,
  onClose,
  onSuccess,
  subtitle,
}) => {
  const { registerPlayer } = useArcade();
  const [name, setName] = useState('');
  const [className, setClassName] = useState<ClassOption | ''>('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Enter a player name (at least 2 characters).');
      arcadeAudio.playSfx('wrong');
      return;
    }
    if (!className) {
      setError('Select your class before entering the arcade.');
      arcadeAudio.playSfx('wrong');
      return;
    }

    setSubmitting(true);
    const res = await registerPlayer(trimmed, className);
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error || 'Could not register player.');
      return;
    }

    onClose();
    onSuccess?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="pixel-panel max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-modal-title"
      >
        <button
          type="button"
          onClick={() => {
            arcadeAudio.playSfx('click');
            onClose();
          }}
          aria-label="Close registration modal"
          className="pixel-btn pixel-btn-ghost p-2 absolute top-4 right-4"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#00F0FF] text-[#04060E] border-2 border-white flex items-center justify-center shrink-0">
            <UserPlus size={20} />
          </div>
          <h2 id="register-modal-title" className="font-pixel text-sm sm:text-base text-[#FFE600]">
            PLAYER SIGN-IN
          </h2>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-5">
          {subtitle ||
            'Register your unique handle and class to save XP, unlock themes, and post official competitive scores.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="player-name-input"
              className="block font-pixel text-[10px] text-[var(--accent-primary)] mb-2"
            >
              PLAYER NAME
            </label>
            <input
              id="player-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="e.g. PixelTesla"
              className="pixel-input w-full px-3 py-2.5 text-base"
              autoFocus
            />
          </div>

          <div>
            <span className="block font-pixel text-[10px] text-[var(--accent-primary)] mb-2">
              SELECT CLASS
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {CLASS_OPTIONS.map((cls) => {
                const selected = className === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => {
                      arcadeAudio.playSfx('click');
                      setClassName(cls);
                    }}
                    className={`py-2.5 px-2 text-xs font-bold border-2 cursor-pointer transition-colors ${
                      selected
                        ? 'bg-[#FFE600] text-[#04060E] border-white'
                        : 'bg-[var(--bg-deep)] text-[var(--text-secondary)] border-[var(--border-pixel)] hover:border-[var(--accent-primary)]'
                    }`}
                  >
                    {cls.replace('Class ', 'Cls ')}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="bg-[#3B0D11] border-2 border-[#FF4D4D] text-[#FFD1D1] px-3 py-2 text-sm flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-[#FF6B6B]" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                arcadeAudio.playSfx('click');
                onClose();
              }}
              className="pixel-btn pixel-btn-ghost flex-1 py-3 text-[10px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="pixel-btn pixel-btn-green flex-1 py-3 text-[10px]"
            >
              {submitting ? 'Saving...' : 'Start Playing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
