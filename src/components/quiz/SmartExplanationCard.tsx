import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Lightbulb, XCircle } from 'lucide-react';
import type { ExamUserAnswer, QuestionType, SmartExplanation } from '../../../shared/types.ts';

interface SmartExplanationCardProps {
  isCorrect: boolean;
  isSkipped?: boolean;
  questionType: QuestionType;
  options: string[];
  matchRight?: string[];
  userAnswer: ExamUserAnswer;
  correctAnswer: number | number[] | string;
  explanation: SmartExplanation;
  defaultExpanded?: boolean;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function formatAnswerLabel(
  type: QuestionType,
  ans: ExamUserAnswer | number | number[] | string,
  options: string[],
  matchRight?: string[]
): string {
  if (ans === null || ans === undefined || ans === '') return 'Unanswered';
  if (type === 'integer') return String(ans);
  if (type === 'multiple' && Array.isArray(ans)) {
    if (ans.length === 0) return 'Unanswered';
    return ans.map((i) => `${LETTERS[i] ?? i + 1} (${options[i] ?? ''})`).join(', ');
  }
  if (type === 'match' && Array.isArray(ans)) {
    return ans
      .map((rIdx, lIdx) =>
        rIdx >= 0
          ? `${lIdx + 1}→${LETTERS[rIdx]}${matchRight?.[rIdx] ? ` (${matchRight[rIdx]})` : ''}`
          : `${lIdx + 1}→?`
      )
      .join(' · ');
  }
  const idx = Number(ans);
  if (Number.isNaN(idx) || idx < 0) return 'Unanswered';
  return `${LETTERS[idx] ?? idx + 1} — ${options[idx] ?? ''}`;
}

export const SmartExplanationCard: React.FC<SmartExplanationCardProps> = ({
  isCorrect,
  isSkipped = false,
  questionType,
  options,
  matchRight,
  userAnswer,
  correctAnswer,
  explanation,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`exam-card p-4 sm:p-5 ${
        isCorrect
          ? 'border-[var(--exam-success)]'
          : isSkipped
            ? 'border-[var(--exam-warning)]'
            : 'border-[var(--exam-danger)]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 font-bold text-sm">
          {isCorrect ? (
            <span className="text-[var(--exam-success)] flex items-center gap-1.5">
              <CheckCircle2 size={18} /> CORRECT
            </span>
          ) : isSkipped ? (
            <span className="text-[var(--exam-warning)] flex items-center gap-1.5">
              <AlertTriangle size={18} /> SKIPPED
            </span>
          ) : (
            <span className="text-[var(--exam-danger)] flex items-center gap-1.5">
              <XCircle size={18} /> INCORRECT
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-semibold text-[var(--exam-accent)] flex items-center gap-1 cursor-pointer"
        >
          {expanded ? (
            <>
              Hide Breakdown <ChevronUp size={14} />
            </>
          ) : (
            <>
              Show Breakdown <ChevronDown size={14} />
            </>
          )}
        </button>
      </div>

      {/* Concise Answer Comparison */}
      <div className="grid sm:grid-cols-2 gap-2.5 text-xs sm:text-sm mb-3">
        <div className="exam-card-subtle px-3 py-2">
          <span className="font-semibold text-[var(--exam-text-muted)]">YOUR ANSWER: </span>
          <span
            className={`font-semibold ${
              isCorrect ? 'text-[var(--exam-success)]' : 'text-[var(--exam-danger)]'
            }`}
          >
            {formatAnswerLabel(questionType, userAnswer, options, matchRight)}
          </span>
        </div>
        <div className="exam-card-subtle px-3 py-2">
          <span className="font-semibold text-[var(--exam-text-muted)]">CORRECT: </span>
          <span className="font-semibold text-[var(--exam-success)]">
            {formatAnswerLabel(questionType, correctAnswer, options, matchRight)}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2.5 text-sm pt-2 border-t border-[var(--exam-border)]">
          <div>
            <span className="font-bold text-[var(--exam-text)]">WHY: </span>
            <span className="text-[var(--exam-text-secondary)]">{explanation.why}</span>
          </div>
          <div>
            <span className="font-bold text-[var(--exam-accent)]">CONCEPT: </span>
            <span className="text-[var(--exam-text-secondary)]">{explanation.concept}</span>
          </div>
          {explanation.commonTrap && (
            <div className="bg-[var(--exam-warning-soft)] border border-[var(--exam-warning)]/40 rounded-md px-3 py-2 text-xs sm:text-sm">
              <span className="font-bold text-[var(--exam-warning)]">COMMON TRAP: </span>
              <span className="text-[var(--exam-text)]">{explanation.commonTrap}</span>
            </div>
          )}
          {explanation.shortcut && (
            <div className="bg-[var(--exam-accent-soft)] border border-[var(--exam-accent)]/40 rounded-md px-3 py-2 text-xs sm:text-sm flex items-start gap-2">
              <Lightbulb size={15} className="text-[var(--exam-accent)] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[var(--exam-accent)]">QUICK TIP: </span>
                <span className="text-[var(--exam-text)]">{explanation.shortcut}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
