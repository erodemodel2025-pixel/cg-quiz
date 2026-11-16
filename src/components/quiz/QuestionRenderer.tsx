import React from 'react';
import { Bookmark, Check, CheckSquare, Square } from 'lucide-react';
import type { ExamUserAnswer, PublicExamQuestion } from '../../../shared/types.ts';

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
      'bg-[var(--exam-surface)] border-[var(--exam-border-strong)] text-[var(--exam-text)] hover:border-[var(--exam-accent)]';
    if (isSelected && !revealed) {
      styleClass =
        'bg-[var(--exam-accent-soft)] border-[var(--exam-accent)] text-[var(--exam-text)] ring-2 ring-[var(--exam-accent)]/25';
    } else if (revealed) {
      if (isCorrectOption) {
        styleClass =
          'bg-[var(--exam-success-soft)] border-[var(--exam-success)] text-[var(--exam-text)]';
      } else if (isWrongChosen) {
        styleClass =
          'bg-[var(--exam-danger-soft)] border-[var(--exam-danger)] text-[var(--exam-text)]';
      } else {
        styleClass =
          'bg-[var(--exam-surface-alt)] border-[var(--exam-border)] text-[var(--exam-text-muted)]';
      }
    }

    const handleClick = () => {
      if (disabled) return;
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
        className={`w-full min-h-[52px] px-4 py-3.5 rounded-lg border text-left flex items-center gap-3.5 transition-colors cursor-pointer disabled:cursor-default ${styleClass}`}
      >
        {isMulti ? (
          <span className="shrink-0 text-[var(--exam-accent)]">
            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
          </span>
        ) : (
          <span
            className={`w-8 h-8 rounded-md border flex items-center justify-center font-code text-xs font-bold shrink-0 ${
              isSelected && !revealed
                ? 'bg-[var(--exam-accent)] text-white border-[var(--exam-accent)]'
                : isCorrectOption
                  ? 'bg-[var(--exam-success)] text-white border-[var(--exam-success)]'
                  : isWrongChosen
                    ? 'bg-[var(--exam-danger)] text-white border-[var(--exam-danger)]'
                    : 'bg-[var(--exam-surface-alt)] text-[var(--exam-text-secondary)] border-[var(--exam-border-strong)]'
            }`}
          >
            {OPTION_LETTERS[idx] ?? idx + 1}
          </span>
        )}

        <span className="flex-1 text-sm sm:text-base font-medium leading-snug">{opt}</span>

        {isSelected && !revealed && (
          <Check size={16} className="text-[var(--exam-accent)] shrink-0" />
        )}
      </button>
    );
  };

  return (
    <div className="exam-card p-5 sm:p-6">
      {/* Compact Metadata Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="text-xs font-medium text-[var(--exam-text-muted)]">
          <span>{question.subject}</span>
          <span> · {question.chapter}</span>
          <span> · {question.difficulty}</span>
          <span> · {question.source}{question.year ? ` ${question.year}` : ''}</span>
        </div>

        {onToggleBookmark && (
          <button
            type="button"
            onClick={onToggleBookmark}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
            className={`p-2 rounded-md border text-xs flex items-center gap-1.5 cursor-pointer shrink-0 ${
              isBookmarked
                ? 'bg-[var(--exam-warning-soft)] border-[var(--exam-warning)] text-[var(--exam-warning)]'
                : 'border-[var(--exam-border-strong)] text-[var(--exam-text-muted)] hover:text-[var(--exam-text)]'
            }`}
          >
            <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
            <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>
        )}
      </div>

      {/* Question Prompt */}
      <h2 className="text-base sm:text-lg font-semibold text-[var(--exam-text)] leading-relaxed mb-4">
        {question.question}
      </h2>

      {/* Assertion / Reason Block */}
      {question.questionType === 'assertion_reason' && (
        <div className="exam-card-subtle p-4 mb-5 space-y-2.5 text-sm">
          <div>
            <span className="font-bold text-[var(--exam-accent)]">Assertion (A): </span>
            <span className="text-[var(--exam-text)]">{question.assertion}</span>
          </div>
          <div>
            <span className="font-bold text-[var(--exam-warning)]">Reason (R): </span>
            <span className="text-[var(--exam-text)]">{question.reason}</span>
          </div>
        </div>
      )}

      {/* Image / Diagram Block */}
      {question.questionType === 'image' && question.imageSvg && (
        <div className="mb-5 rounded-lg overflow-hidden border border-[var(--exam-border-strong)] bg-slate-950 p-3">
          <div
            className="max-w-md mx-auto aspect-[360/170]"
            dangerouslySetInnerHTML={{ __html: question.imageSvg }}
          />
          {question.imageCaption && (
            <div className="text-xs text-slate-300 text-center mt-2">
              {question.imageCaption}
            </div>
          )}
        </div>
      )}

      {/* Type-Specific Interactive Inputs */}
      {question.questionType === 'integer' ? (
        <div className="space-y-2">
          <label
            htmlFor={`int-${question.id}`}
            className="block text-xs font-semibold uppercase tracking-wide text-[var(--exam-text-muted)]"
          >
            Enter Numerical / Integer Answer
          </label>
          <input
            id={`int-${question.id}`}
            type="text"
            inputMode="decimal"
            disabled={disabled}
            value={userAnswer === null || userAnswer === undefined ? '' : String(userAnswer)}
            onChange={(e) => onChangeAnswer(e.target.value)}
            placeholder="Type exact number (e.g. 9)"
            className="exam-input w-full sm:max-w-xs px-4 py-3 font-code text-base font-bold"
          />
          {revealed && (
            <div className="text-sm font-code text-[var(--exam-success)] pt-1">
              Correct Answer: {String(revealCorrectAnswer)}
            </div>
          )}
        </div>
      ) : question.questionType === 'match' && question.matchPairs ? (
        <div className="space-y-3">
          <div className="text-xs font-medium text-[var(--exam-text-muted)]">
            Match each item in List I to its corresponding item in List II:
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
                  className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    revealed
                      ? rowCorrect
                        ? 'bg-[var(--exam-success-soft)] border-[var(--exam-success)]'
                        : 'bg-[var(--exam-danger-soft)] border-[var(--exam-danger)]'
                      : 'bg-[var(--exam-surface-alt)] border-[var(--exam-border-strong)]'
                  }`}
                >
                  <div className="text-sm font-semibold text-[var(--exam-text)]">
                    <span className="font-code text-[var(--exam-accent)] mr-2">
                      {rowIdx + 1}.
                    </span>
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
                    className="exam-input px-3 py-2 text-sm min-h-[42px] sm:w-72"
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
            <div className="text-xs font-code text-[var(--exam-success)] pt-1">
              Correct Mapping:{' '}
              {revealCorrectAnswer
                .map((rIdx, lIdx) => `${lIdx + 1}→${OPTION_LETTERS[rIdx]}`)
                .join(' · ')}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {question.questionType === 'multiple' && (
            <div className="text-xs font-medium text-[var(--exam-accent)] mb-1">
              Multiple options may be correct — select all that apply.
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
