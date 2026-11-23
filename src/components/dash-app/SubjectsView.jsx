import { useState } from 'react';
import csCurriculum from '../../data/csSubjects.json';
import { useAuth } from '../auth/AuthContext';
import {
  Books,
  GraduationCap,
  Sparkle,
  ArrowRight,
  Code,
  Brain,
  Stack,
  TrendUp,
  Lightning,
  CheckCircle,
} from '../icons';

export const SubjectsView = ({ onSelectTopic, onNewCustomChat }) => {
  const { userProfile } = useAuth();
  const initialYear = userProfile?.year_of_study ? String(userProfile.year_of_study) : 'all';
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredYears = csCurriculum.filter((y) => {
    if (selectedYear !== 'all' && String(y.year) !== selectedYear) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 text-left bg-white select-none">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Header Hero Banner */}
        <div className="relative rounded-3xl bg-zinc-900 text-white p-6 sm:p-8 overflow-hidden shadow-sm">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-zinc-200 mb-3 backdrop-blur-xs">
              <Sparkle size={14} weight="fill" className="text-zinc-200" />
              <span>Personalized Computer Science Curriculum</span>
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-white">
              Explore Computer Science Topics (1st–4th Year)
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
              Choose any subject or specific topic from the university syllabus to generate an interactive, Socratic lesson with math formulas, concept cards, and self-checks.
            </p>
          </div>
          {/* Subtle background glow */}
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }}
          />
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          {/* Year Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Years' },
              { id: '1', label: '1st Year' },
              { id: '2', label: '2nd Year' },
              { id: '3', label: '3rd Year' },
              { id: '4', label: '4th Year' },
            ].map((tab) => {
              const active = selectedYear === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedYear(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-zinc-900 text-white shadow-2xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics or subjects..."
              className="w-full px-3.5 py-1.5 bg-zinc-100/90 rounded-xl text-xs text-zinc-800 placeholder:text-zinc-400 border border-zinc-200/80 outline-none focus:border-zinc-400 transition-colors"
            />
          </div>
        </div>

        {/* Curriculum Content */}
        <div className="space-y-10">
          {filteredYears.map((yearGroup) => {
            const subjects = yearGroup.subjects.filter((subj) => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              const matchSubj = subj.name.toLowerCase().includes(q) || subj.description.toLowerCase().includes(q);
              const matchTopic = subj.topics.some((t) => t.toLowerCase().includes(q));
              return matchSubj || matchTopic;
            });

            if (subjects.length === 0) return null;

            return (
              <div key={yearGroup.year} className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 border border-zinc-200/80 text-zinc-800 shadow-2xs font-bold text-xs">
                    Y{yearGroup.year}
                  </span>
                  <div>
                    <h2 className="font-display font-bold text-base sm:text-lg text-zinc-900 leading-tight">
                      {yearGroup.yearLabel}
                    </h2>
                    <p className="text-[11.5px] text-zinc-500 font-medium">
                      {yearGroup.description}
                    </p>
                  </div>
                </div>

                {/* Subject Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjects.map((subj) => (
                    <div
                      key={subj.id}
                      className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-display font-bold text-sm text-zinc-900">
                            {subj.name}
                          </h3>
                          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200/60">
                            {subj.topics.length} Topics
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                          {subj.description}
                        </p>

                        {/* Topic Pill List */}
                        <div className="space-y-1.5 mb-4">
                          {subj.topics.map((topic) => (
                            <button
                              key={topic}
                              type="button"
                              onClick={() => onSelectTopic && onSelectTopic(subj.name, topic)}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50/80 hover:bg-zinc-100/90 border border-zinc-200/60 text-left transition-colors group cursor-pointer text-xs"
                            >
                              <span className="text-zinc-700 font-medium group-hover:text-zinc-900 truncate pr-2">
                                {topic}
                              </span>
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 group-hover:text-black shrink-0">
                                <span>Learn</span>
                                <ArrowRight size={12} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SubjectsView;
