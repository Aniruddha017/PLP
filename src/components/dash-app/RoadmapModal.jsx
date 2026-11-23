import { useState, useEffect } from 'react';
import { X, Sparkle, CircleNotch, ArrowRight, CheckCircle, Clock, Books, Lightning } from '../icons';
import chatbotService from '../../services/chatbotService';

export const RoadmapModal = ({
  isOpen,
  onClose,
  subject = 'Computer Science',
  topic = 'General Inquiry',
  conversationId = null,
  onSelectPracticeProblem,
}) => {
  const [roadmap, setRoadmap] = useState([]);
  const [outcome, setOutcome] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !topic) return;

    let isCancelled = false;

    const fetchRoadmap = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await chatbotService.generateRoadmap({
          subject,
          topic,
          conversationId,
        });
        if (isCancelled) return;
        setRoadmap(data.roadmap || []);
        setOutcome(data.learning_outcome || '');
      } catch (err) {
        if (isCancelled) return;
        console.warn('Could not load roadmap:', err);
        setError('Failed to generate roadmap. Please ensure backend is active.');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchRoadmap();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, subject, topic, conversationId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-zinc-200/90 text-left flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-2xs">
              <Sparkle size={18} weight="fill" />
            </span>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-zinc-500 uppercase tracking-wider">
                <span>{subject}</span>
                <span>•</span>
                <span>Personalized Roadmap</span>
              </div>
              <h3 className="font-display font-bold text-base sm:text-lg text-zinc-900 leading-tight">
                {topic} Mastery Path
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
        <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
          {outcome && (
            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/70 text-xs text-zinc-700 leading-relaxed">
              <strong className="font-semibold text-zinc-900">Learning Outcome:</strong> {outcome}
            </div>
          )}

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-3 text-zinc-500 text-xs">
              <CircleNotch size={24} className="animate-spin text-zinc-900" />
              <span>Architecting your personalized 5-step curriculum for {topic}...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-rose-600 text-xs font-medium">
              {error}
            </div>
          ) : roadmap.length === 0 ? (
            <div className="py-10 text-center text-zinc-500 text-xs">
              No roadmap generated yet.
            </div>
          ) : (
            <div className="space-y-3">
              {roadmap.map((step, idx) => (
                <div
                  key={step.step || idx}
                  className="rounded-2xl border border-zinc-200/80 bg-white p-4.5 shadow-2xs hover:border-zinc-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-white text-[11px] font-bold shrink-0">
                        {step.step || idx + 1}
                      </span>
                      <h4 className="font-display font-bold text-sm text-zinc-900">
                        {step.title}
                      </h4>
                    </div>
                    {step.estimated_hours && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full shrink-0">
                        <Clock size={12} weight="bold" />
                        <span>{step.estimated_hours}h</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-600 leading-relaxed mb-3 pl-8">
                    {step.description}
                  </p>

                  {/* Key Concepts Tags */}
                  {Array.isArray(step.key_concepts) && step.key_concepts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-8 mb-3">
                      {step.key_concepts.map((concept, cIdx) => (
                        <span
                          key={cIdx}
                          className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200/60 text-[10px] font-medium text-zinc-700"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Practice Challenge Box */}
                  {step.practice_problem && (
                    <div className="ml-8 p-3 rounded-xl bg-zinc-50/90 border border-zinc-200/70 text-xs text-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <Lightning size={14} weight="fill" className="text-zinc-800 shrink-0" />
                        <span className="font-medium text-[11.5px] text-zinc-700">
                          {step.practice_problem}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectPracticeProblem) {
                            onSelectPracticeProblem(step.practice_problem);
                            onClose();
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-black text-white text-[10.5px] font-semibold shrink-0 transition-colors cursor-pointer flex items-center gap-1 self-end sm:self-auto"
                      >
                        <span>Solve in Chat</span>
                        <ArrowRight size={11} weight="bold" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-100 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Roadmap
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoadmapModal;
