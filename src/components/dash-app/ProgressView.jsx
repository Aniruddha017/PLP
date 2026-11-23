import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import analyticsService from '../../services/analyticsService';
import {
  ChartLineUp,
  CheckCircle,
  Clock,
  Sparkle,
  ArrowRight,
  CircleNotch,
  TrendUp,
  Stack,
  Lightning,
} from '../icons';

export const ProgressView = ({ onPracticeTopic, onStartChat }) => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    let isCancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const res = await analyticsService.getStudentAnalytics(user.id);
        if (isCancelled) return;
        setData(res);
      } catch (err) {
        console.warn('Failed to load progress analytics:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-zinc-500 text-xs">
        <CircleNotch size={24} className="animate-spin text-zinc-900 mb-2" />
        <span>Aggregating curriculum analytics and cognitive retention curve...</span>
      </div>
    );
  }

  const topics = data?.topics || [];
  const subjects = data?.subjects || [];
  const quizzes = data?.quizzes || [];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 text-left bg-white select-none">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              <ChartLineUp size={15} weight="bold" className="text-zinc-700" />
              <span>Cognitive Mastery & Spaced Repetition</span>
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-zinc-900 tracking-tight">
              Curriculum Progress & Learning Analytics
            </h1>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
              Average Mastery
            </span>
            <div className="text-2xl sm:text-3xl font-display font-bold text-zinc-900 font-mono">
              {data?.averageMastery || 0}%
            </div>
            <span className="text-[10.5px] text-zinc-400 font-medium mt-1 block">
              Across all recorded topics
            </span>
          </div>

          <div className="p-4.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
              Mastered Topics
            </span>
            <div className="text-2xl sm:text-3xl font-display font-bold text-zinc-900 font-mono">
              {data?.masteredCount || 0}
            </div>
            <span className="text-[10.5px] text-emerald-600 font-medium mt-1 block flex items-center gap-1">
              <CheckCircle size={12} weight="fill" /> Score &ge; 90%
            </span>
          </div>

          <div className="p-4.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
              In Review
            </span>
            <div className="text-2xl sm:text-3xl font-display font-bold text-zinc-900 font-mono">
              {data?.inReviewCount || 0}
            </div>
            <span className="text-[10.5px] text-zinc-500 font-medium mt-1 block">
              Active retention zone
            </span>
          </div>

          <div className="p-4.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
              Total Quizzes Taken
            </span>
            <div className="text-2xl sm:text-3xl font-display font-bold text-zinc-900 font-mono">
              {quizzes.length}
            </div>
            <span className="text-[10.5px] text-zinc-400 font-medium mt-1 block">
              Diagnostic assessments
            </span>
          </div>
        </div>

        {/* Subject Breakdown Progress Bars */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-base text-zinc-900">
              Subject Mastery Breakdown
            </h2>
            <span className="text-xs text-zinc-400">
              {subjects.length} Subjects Evaluated
            </span>
          </div>

          {subjects.length === 0 ? (
            <p className="text-xs text-zinc-400 py-4">No subject mastery data recorded yet.</p>
          ) : (
            <div className="space-y-3.5">
              {subjects.map((subj) => (
                <div key={subj.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-zinc-800">
                    <span>{subj.name}</span>
                    <span className="font-mono">{subj.averageMastery}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 bg-zinc-900"
                      style={{ width: `${subj.averageMastery}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detailed Spaced-Repetition Topic Tracker */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-base text-zinc-900">
                Spaced-Repetition Review Schedule
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Target intervals calibrated to counteract the cognitive forgetting curve
              </p>
            </div>
          </div>

          {topics.length === 0 ? (
            <p className="text-xs text-zinc-400 py-6 text-center">No topic mastery recorded yet.</p>
          ) : (
            <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
              {topics.map((t) => {
                const nextReview = t.next_review_at ? new Date(t.next_review_at) : null;
                const formattedDate = nextReview
                  ? nextReview.toLocaleDateString([], { month: 'short', day: 'numeric' })
                  : 'Tomorrow';

                return (
                  <div
                    key={t.id || t.topic_name}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`flex h-2.5 w-2.5 rounded-full shrink-0 ${
                        t.mastery_percentage >= 90
                          ? 'bg-emerald-500'
                          : t.mastery_percentage >= 60
                          ? 'bg-amber-500'
                          : 'bg-zinc-300'
                      }`} />
                      <div className="min-w-0">
                        <span className="font-bold text-zinc-900 block truncate">
                          {t.topic_name}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {t.subject} • Status: {t.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="font-bold font-mono text-zinc-900 block">
                          {t.mastery_percentage}%
                        </span>
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <Clock size={11} /> Review: {formattedDate}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onPracticeTopic && onPracticeTopic(t.subject, t.topic_name)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <span>Practice</span>
                        <ArrowRight size={11} weight="bold" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Diagnostic Quiz Attempts */}
        {quizzes.length > 0 && (
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <h2 className="font-display font-bold text-base text-zinc-900">
              Recent Assessment Activity
            </h2>
            <div className="divide-y divide-zinc-100">
              {quizzes.map((q) => {
                const dateStr = q.completed_at
                  ? new Date(q.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Recent';

                return (
                  <div key={q.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-zinc-800 block">
                        {q.topic_name}
                      </span>
                      <span className="text-[10.5px] text-zinc-400">
                        {q.subject} • {dateStr}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900">
                        {q.score} / {q.total}
                      </span>
                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                        {Math.round((q.score / (q.total || 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressView;
