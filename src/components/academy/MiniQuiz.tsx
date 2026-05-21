'use client';

import { useState } from 'react';
import { apiClient, type AcademyQuiz } from '@/lib/api';

interface Props {
  lessonId: string;
  quiz: AcademyQuiz;
  isAuthenticated: boolean;
  onCompleted?: () => void;
}

export default function MiniQuiz({ lessonId, quiz, isAuthenticated, onCompleted }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    feedback: string;
    correct_option_index: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (selected === null) return;
    setSubmitting(true);
    setError(null);

    if (!isAuthenticated) {
      // Login yok — yine de seçim yapıldı, ama backend'e gönderemeyiz.
      // Local UI feedback: kullanıcıyı /auth/login'e yönlendirmek için CTA.
      setError('İlerlemeni kaydetmek için Telegram /login ile giriş yap.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await apiClient.submitAcademyProgress(lessonId, selected);
      if (res.quiz) {
        setResult(res.quiz);
        onCompleted?.();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Quiz gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-[#26314a] bg-[#161629] p-5">
      <div className="text-xs font-semibold text-[#26de81] uppercase tracking-wider mb-3">
        📝 Mini Quiz
      </div>
      <p className="text-white mb-4">{quiz.question}</p>

      <div className="space-y-2">
        {quiz.options.map((opt, i) => {
          const chosen = selected === i;
          const isCorrect = result && i === result.correct_option_index;
          const isWrongChoice = result && chosen && !result.correct;
          let className =
            'w-full text-left px-4 py-2.5 rounded-lg border transition-colors text-sm';
          if (result) {
            if (isCorrect) {
              className += ' border-[#26de81] bg-[#26de81]/10 text-[#26de81]';
            } else if (isWrongChoice) {
              className += ' border-red-500/60 bg-red-500/10 text-red-300';
            } else {
              className += ' border-[#26314a] bg-[#0e0e1a] text-gray-400';
            }
          } else if (chosen) {
            className += ' border-[#4fc3f7] bg-[#4fc3f7]/10 text-white';
          } else {
            className += ' border-[#26314a] bg-[#0e0e1a] text-gray-200 hover:border-[#4fc3f7]/60';
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => !result && setSelected(i)}
              disabled={!!result || submitting}
              className={className}
            >
              <span className="font-mono text-xs text-gray-500 mr-2">{String.fromCharCode(65 + i)}.</span>
              {opt.text}
            </button>
          );
        })}
      </div>

      {!result && (
        <button
          type="button"
          onClick={submit}
          disabled={selected === null || submitting}
          className="mt-4 px-4 py-2 rounded-lg bg-[#26de81] text-[#0e0e1a] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#26de81]/90 text-sm"
        >
          {submitting ? 'Gönderiliyor…' : 'Cevabımı gönder'}
        </button>
      )}

      {result && (
        <div
          className={`mt-4 rounded-lg p-3 text-sm ${
            result.correct
              ? 'bg-[#26de81]/10 border border-[#26de81]/40 text-[#26de81]'
              : 'bg-red-500/10 border border-red-500/40 text-red-300'
          }`}
        >
          <div className="font-semibold mb-1">
            {result.correct ? '✓ Doğru' : '✗ Yanlış'}
          </div>
          <div className="text-gray-300">{result.feedback}</div>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg p-3 text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-300">
          {error}
        </div>
      )}
    </div>
  );
}
