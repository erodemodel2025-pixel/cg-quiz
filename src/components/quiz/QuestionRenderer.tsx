import React from 'react';
import { arcadeAudio } from '../../audio/arcadeAudio.ts';
import type { ExamUserAnswer, PublicExamQuestion } from '../../../shared/types.ts';
import { PixelIcon } from '../pixel/PixelArtAssets.tsx';

interface QuestionRendererProps {
  question: PublicExamQuestion;
  userAnswer: ExamUserAnswer;
  onChangeAnswer: (answer: ExamUserAnswer) => void;
  disabled?: boolean;
  /** Only populated AFTER an answer is checked/submitted in immediate-feedback modes */
  revealCorrectAnswer?: number | number[] | string | null;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  userAnswer,
  onChangeAnswer,
  disabled = false,
  revealCorrectAnswer = null,
  isBookmarked = false,
  onToggleBookmark,
}) => {
  const revealed = revealCorrectAnswer !== null && revealCorrectAnswer !== undefined;

  const renderChoiceBox = (opt: string, idx: number, isMulti: boolean) => {
    const selectedArr = Array.isArray(userAnswer) ? userAnswer.map(Number) : [];
    const isSelected = isMulti ? selectedArr.includes(idx) : userAnswer === idx;

    const correctArr = Array.isArray(revealCorrectAnswer)
      ? revealCorrectAnswer.map(Number)
      : typeof revealCorrectAnswer === 'number'
        ? [revealCorrectAnswer]
        : [];
    const isCorrectOption = revealed && correctArr.includes(idx);
    const isWrongChosen = revealed && isSelected && !isCorrectOption;

    let styleClass =
      'bg-[var(--exam-surface-alt)] border-[var(--exam-border)] text-[var(--exam-text)] hover:border-[var(--exam-accent)]';
    if (isSelected && !revealed) {
      styleClass =
        'bg-[var(--exam-accent-soft)] border-[var(--voxel-gold)] text-[var(--exam-text)] ring-2 ring-[var(--voxel-gold)]';
    } else if (revealed) {
      if (isCorrectOption) {
        styleClass =
          'bg-[var(--exam-success-soft)] border-[var(--exam-success)] text-[var(--exam-text)] animate-pixel-pop';
      } else if (isWrongChosen) {
        styleClass =
          'bg-[var(--exam-danger-soft)] border-[var(--exam-danger)] text-[var(--exam-text)] animate-pixel-shake';
      } else {
        styleClass =
          'bg-[var(--exam-surface-alt)] border-[var(--exam-border)] text-[var(--exam-text-muted)] opacity-75';
      }
    }

    const handleClick = () => {
      if (disabled) return;
      arcadeAudio.playSfx('click');
      if (isMulti) {
        const next = isSelected
          ? selectedArr.filter((i) => i !== idx)
          : [...selectedArr, idx].sort((a, b) => a - b);
        onChangeAnswer(next);
      } else {
        onChangeAnswer(idx);
      }
    };

    return (
      <button
        key={idx}
        type="button"
        disabled={disabled}
        onClick={handleClick}
        aria-pressed={isSelected}
        className={`voxel-tile w-full min-h-[56px] px-4 py-3.5 text-left flex items-center gap-3.5 cursor-pointer disabled:cursor-default ${styleClass}`}
      >
        <span
          className={`w-9 h-9 border-2 flex items-center justify-center font-pixel text-xs shrink-0 ${
            isSelected && !revealed
              ? 'bg-[var(--voxel-gold)] text-[#0B0F1A] border-[#0B0F1A]'
              : isCorrectOption
                ? 'bg-[var(--exam-success)] text-[#07120C] border-[#0B0F1A]'
                : isWrongChosen
                  ? 'bg-[var(--exam-danger)] text-white border-[#0B0F1A]'
                  : 'bg-[var(--exam-surface)] text-[var(--exam-text)] border-[var(--exam-border)]'
          }`}
        >
          {OPTION_LETTERS[idx] ?? idx + 1}
        </span>

        <span className="flex-1 text-sm sm:text-base font-semibold leading-snug">{opt}</span>

        {isSelected && !revealed && (
          <span className="text-[var(--voxel-gold)] shrink-0">
            <PixelIcon name="check" size={16} />
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="exam-card p-5 sm:p-7">
      {/* Compact Metadata Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-display-pixel">
          <span className="px-2 py-0.5 bg-[var(--exam-accent-soft)] border-2 border-[var(--exam-border)] text-[var(--exam-accent)]">
            {question.subject}
          </span>
          <span className="text-[var(--exam-text-muted)]">
            {question.chapter} · {question.difficulty}
          </span>
        </div>

        {onToggleBookmark && (
          <button
            type="button"
            onClick={() => {
              arcadeAudio.playSfx('click');
              onToggleBookmark();
            }}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
            className={`px-2.5 py-1.5 border-2 font-display-pixel text-xs flex items-center gap-1.5 cursor-pointer shrink-0 ${
              isBookmarked
                ? 'bg-[var(--exam-warning-soft)] border-[var(--exam-warning)] text-[var(--exam-warning)]'
                : 'bg-[var(--exam-surface-alt)] border-[var(--exam-border)] text-[var(--exam-text-muted)] hover:text-[var(--exam-text)]'
            }`}
          >
            <PixelIcon name="bookmark" size={13} />
            <span className="hidden sm:inline">{isBookmarked ? 'SAVED' : 'SAVE'}</span>
          </button>
        )}
      </div>

      {/* Highly Readable Question Prompt */}
      <h2 className="text-lg sm:text-xl font-bold text-[var(--exam-text)] leading-relaxed mb-5">
        {question.question}
      </h2>

      {/* Assertion / Reason Block */}
      {question.questionType === 'assertion_reason' && (
        <div className="exam-card-subtle p-4 mb-5 space-y-2.5 text-sm sm:text-base">
          <div>
            <span className="font-display-pixel text-xs font-bold text-[var(--exam-accent)] mr-2">
              ASSERTION (A):
            </span>
            <span className="text-[var(--exam-text)]">{question.assertion}</span>
          </div>
          <div>
            <span className="font-display-pixel text-xs font-bold text-[var(--exam-warning)] mr-2">
              REASON (R):
            </span>
            <span className="text-[var(--exam-text)]">{question.reason}</span>
          </div>
        </div>
      )}

      {/* Image / Diagram Block */}
      {question.questionType === 'image' && question.imageSvg && (
        <div className="mb-5 border-3 border-[var(--exam-border)] bg-slate-950 p-3">
          <div
            className="max-w-md mx-auto aspect-[360/170]"
            dangerouslySetInnerHTML={{ __html: question.imageSvg }}
          />
          {question.imageCaption && (
            <div className="text-xs text-slate-300 text-center mt-2">{question.imageCaption}</div>
          )}
        </div>
      )}

      {/* Type-Specific Interactive Inputs */}
      {question.questionType === 'integer' ? (
        <div className="space-y-2.5">
          <label
            htmlFor={`int-${question.id}`}
            className="block font-display-pixel text-xs text-[var(--exam-text-muted)]"
          >
            ENTER NUMERICAL ANSWER
          </label>
          <input
            id={`int-${question.id}`}
            type="text"
            inputMode="decimal"
            disabled={disabled}
            value={userAnswer === null || userAnswer === undefined ? '' : String(userAnswer)}
            onChange={(e) => onChangeAnswer(e.target.value)}
            placeholder="e.g. 9"
            className="exam-input w-full sm:max-w-xs px-4 py-3 font-code text-base font-bold"
          />
          {revealed && (
            <div className="font-display-pixel text-sm text-[var(--exam-success)] pt-1">
              CORRECT ANSWER: {String(revealCorrectAnswer)}
            </div>
          )}
        </div>
      ) : question.questionType === 'match' && question.matchPairs ? (
        <div className="space-y-3">
          <div className="font-display-pixel text-xs text-[var(--exam-text-muted)]">
            MATCH LIST I TO LIST II:
          </div>
          <div className="space-y-2.5">
            {question.matchPairs.left.map((leftLabel, rowIdx) => {
              const currentArr = Array.isArray(userAnswer)
                ? [...userAnswer]
                : question.matchPairs!.left.map(() => -1);
              const selectedRight = currentArr[rowIdx] ?? -1;
              const expectedRight = Array.isArray(revealCorrectAnswer)
                ? revealCorrectAnswer[rowIdx]
                : null;
              const rowCorrect = revealed && expectedRight === selectedRight;

              return (
                <div
                  key={rowIdx}
                  className={`p-3 border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    revealed
                      ? rowCorrect
                        ? 'bg-[var(--exam-success-soft)] border-[var(--exam-success)]'
                        : 'bg-[var(--exam-danger-soft)] border-[var(--exam-danger)]'
                      : 'bg-[var(--exam-surface-alt)] border-[var(--exam-border)]'
                  }`}
                >
                  <div className="text-sm sm:text-base font-semibold text-[var(--exam-text)]">
                    <span className="font-code text-[var(--exam-accent)] mr-2">{rowIdx + 1}.</span>
                    {leftLabel}
                  </div>
                  <select
                    disabled={disabled}
                    value={selectedRight}
                    aria-label={`Match for ${leftLabel}`}
                    onChange={(e) => {
                      const next = [...currentArr];
                      next[rowIdx] = Number(e.target.value);
                      onChangeAnswer(next);
                    }}
                    className="exam-input px-3 py-2 text-sm min-h-[44px] sm:w-72"
                  >
                    <option value={-1}>Select match...</option>
                    {question.matchPairs!.right.map((rOpt, rIdx) => (
                      <option key={rIdx} value={rIdx}>
                        {OPTION_LETTERS[rIdx]}. {rOpt}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          {revealed && Array.isArray(revealCorrectAnswer) && (
            <div className="font-code text-xs text-[var(--exam-success)] pt-1">
              Correct Mapping:{' '}
              {revealCorrectAnswer
                .map((rIdx, lIdx) => `${lIdx + 1}→${OPTION_LETTERS[rIdx]}`)
                .join(' · ')}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {question.questionType === 'multiple' && (
            <div className="font-display-pixel text-xs text-[var(--exam-accent)]">
              SELECT ALL CORRECT BLOCKS:
            </div>
          )}
          {question.options.map((opt, idx) =>
            renderChoiceBox(opt, idx, question.questionType === 'multiple')
          )}
        </div>
      )}
    </div>
  );
};
