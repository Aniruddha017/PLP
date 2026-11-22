import { useState, useEffect } from 'react';
import { X, CheckCircle, CircleNotch, ArrowRight, Sparkle, Lightning, WarningCircle } from '../icons';
import chatbotService from '../../services/chatbotService';
import MarkdownRenderer from '../ui/MarkdownRenderer';

export const QuizModal = ({
  isOpen,
  onClose,
  subject = 'Computer Science',
  topic = 'General Inquiry',
  conversationId = null,
  onAskTutor,
}) => {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !topic) return;

    let isCancelled = false;

    const fetchQuiz = async () => {
      setLoading(true);
      setError('');
      setResult(null);
      setAnswers({});
      try {
        const data = await chatbotService.generateQuiz({
          subject,
          topic,
          difficulty: 'intermediate',
          conversationId,
        });
        if (isCancelled) return;
        setQuestions(data.questions || []);
      } catch (err) {
        if (isCancelled) return;
        console.warn('Could not generate quiz:', err);
        setError('Failed to generate diagnostic quiz. Please check server connection.');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchQuiz();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, subject, topic, conversationId]);

  if (!isOpen) return null;

  const handleSelectOption = (questionId, optionIndex) => {
    if (result) return; // Prevent changing after evaluation
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      alert('Please answer all questions before submitting your assessment.');
      return;
    }

    setEvaluating(true);
    setError('');

    try {
      const studentAnswers = Object.entries(answers).map(([qId, optIdx]) => ({
        question_id: Number(qId),
        selected_option_index: Number(optIdx),
      }));

      const res = await chatbotService.evaluateQuiz({
        subject,
        topic,
        questions,
        studentAnswers,
        conversationId,
      });

      setResult(res);
    } catch (err) {
      console.warn('Could not evaluate quiz:', err);
      setError('Evaluation error. Please try again.');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-zinc-200/90 text-left flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-2xs">
              <Lightning size={18} weight="fill" />
            </span>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-zinc-500 uppercase tracking-wider">
                <span>{subject}</span>
                <span>•</span>
                <span>Adaptive Practice Quiz</span>
              </div>
              <h3 className="font-display font-bold text-base sm:text-lg text-zinc-900 leading-tight">
                {topic} Assessment
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-6 pr-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center gap-3 text-zinc-500 text-xs">
              <CircleNotch size={24} className="animate-spin text-zinc-900" />
              <span>Generating conceptual diagnostic problems for {topic}...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-rose-600 text-xs font-medium">
              {error}
            </div>
          ) : questions.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No questions found for this topic.
            </div>
          ) : (
            <>
              {/* Result Summary Banner (if evaluated) */}
              {result && (
                <div className="p-4 rounded-2xl bg-zinc-900 text-white space-y-2 shadow-sm animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Assessment Results
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/15 text-white">
                      Score: {result.score} / {result.total} ({result.percentage}%)
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-100 leading-relaxed">
                    {result.feedback_summary}
                  </p>
                  <div className="pt-1 flex items-center gap-2 text-[11px] text-zinc-300">
                    <span>Updated Topic Mastery:</span>
                    <span className="font-bold font-mono text-white text-xs">{result.new_mastery_percentage}%</span>
                  </div>
                </div>
              )}

              {/* Questions List */}
              <div className="space-y-6">
                {questions.map((q, idx) => {
                  const selectedIdx = answers[q.id];
                  const detail = result?.details?.find((d) => d.question_id === q.id);

                  return (
                    <div
                      key={q.id || idx}
                      className="p-5 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 space-y-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-bold text-zinc-800 shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="font-sans font-semibold text-xs sm:text-[13px] text-zinc-900 leading-snug">
                          <MarkdownRenderer content={q.question} />
                        </div>
                      </div>

                      {/* Options Radio List */}
                      <div className="space-y-2 pl-7">
                        {Array.isArray(q.options) &&
                          q.options.map((opt, optIdx) => {
                            const isSelected = selectedIdx === optIdx;
                            let optionStyle = 'bg-white border-zinc-200/80 hover:border-zinc-300 text-zinc-700';

                            if (result) {
                              const isCorrectOpt = q.correct_option_index === optIdx;
                              if (isCorrectOpt) {
                                optionStyle = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold';
                              } else if (isSelected && !isCorrectOpt) {
                                optionStyle = 'bg-rose-50 border-rose-300 text-rose-900';
                              } else {
                                optionStyle = 'bg-white/60 border-zinc-200/50 text-zinc-400';
                              }
                            } else if (isSelected) {
                              optionStyle = 'bg-zinc-900 text-white border-zinc-900 font-medium shadow-2xs';
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={!!result}
                                onClick={() => handleSelectOption(q.id, optIdx)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left text-xs transition-colors cursor-pointer ${optionStyle}`}
                              >
                                <span className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9.5px] font-bold shrink-0 ${
                                  isSelected
                                    ? result ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-900'
                                    : 'border-zinc-300 text-zinc-500'
                                }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="flex-1 leading-snug">
                                  <MarkdownRenderer content={opt} />
                                </span>
                              </button>
                            );
                          })}
                      </div>

                      {/* Post-Evaluation Explanation */}
                      {result && detail && (
                        <div className="ml-7 mt-2 p-3 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-700 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-zinc-900">
                            {detail.is_correct ? (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <CheckCircle size={14} weight="fill" /> Correct
                              </span>
                            ) : (
                              <span className="text-rose-600 flex items-center gap-1">
                                <WarningCircle size={14} weight="fill" /> Incorrect
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] leading-relaxed text-zinc-600">
                            {detail.explanation}
                          </p>
                          {detail.formula && (
                            <div className="pt-1 font-mono text-[11px] font-semibold text-zinc-800">
                              Formula: <MarkdownRenderer content={detail.formula} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-zinc-100 shrink-0 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 font-medium">
            {result ? 'Mastery percentage saved to your profile' : `${Object.keys(answers).length} of ${questions.length} answered`}
          </span>

          <div className="flex items-center gap-2">
            {!result ? (
              <button
                type="button"
                disabled={loading || evaluating || questions.length === 0}
                onClick={handleSubmit}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black disabled:opacity-40 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {evaluating ? (
                  <>
                    <CircleNotch size={14} className="animate-spin" />
                    <span>Grading...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Assessment</span>
                    <ArrowRight size={13} weight="bold" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizModal;
