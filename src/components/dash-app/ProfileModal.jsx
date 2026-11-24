import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  X,
  User,
  GraduationCap,
  Brain,
  Compass,
  Check,
  CircleNotch,
  Sparkle,
  Clock,
  ArrowRight,
  ArrowClockwise,
} from '../icons';

const BRANCH_OPTIONS = [
  'Computer Science & Engineering (CSE)',
  'Information Technology (IT)',
  'Artificial Intelligence & Machine Learning',
  'Electronics & Communication (ECE)',
  'Electrical Engineering (EE)',
  'Mechanical Engineering (ME)',
  'Civil Engineering (CE)',
  'Other / Science & Tech',
];

const LANGUAGE_OPTIONS = ['English', 'Hinglish', 'Hindi'];
const PROFICIENCY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const APPROACH_OPTIONS = [
  'Step-by-step explanations',
  'Examples',
  'Visual learning',
  'Theory',
  'Practical implementation',
];
const DEPTH_OPTIONS = ['Beginner-friendly', 'Balanced', 'In-depth'];

const GOALS_LIST = [
  'University Examinations',
  'Campus Placements & Interviews',
  'GATE CS / IT',
  'Competitive Programming',
  'Full Stack / Software Projects',
  'Research & Higher Studies',
];

const SUBJECTS_LIST = [
  'Data Structures & Algorithms',
  'Operating Systems',
  'Database Management (DBMS)',
  'Computer Networks',
  'Machine Learning & AI',
  'Discrete Mathematics & Logic',
  'Computer Organization & Architecture',
  'Theory of Computation (Automata)',
  'Compiler Design',
  'Software Engineering & System Design',
];

const TIME_OPTIONS = [
  '30-45 minutes / day',
  '1-2 hours / day',
  '2-3 hours / day',
  '4+ hours / day',
];

export const ProfileModal = ({ isOpen, onClose, onRetakeOnboarding }) => {
  const { user, userProfile, updateProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('academic'); // 'academic' | 'preferences' | 'goals'
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [fullName, setFullName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [branch, setBranch] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState(2);
  const [semester, setSemester] = useState(4);

  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [programmingProficiency, setProgrammingProficiency] = useState('Beginner');
  const [learningApproach, setLearningApproach] = useState('Step-by-step explanations');
  const [explanationDepth, setExplanationDepth] = useState('Balanced');

  const [primaryGoals, setPrimaryGoals] = useState([]);
  const [subjectsOfInterest, setSubjectsOfInterest] = useState([]);
  const [weakSubjects, setWeakSubjects] = useState([]);
  const [dailyLearningTime, setDailyLearningTime] = useState('1-2 hours / day');

  useEffect(() => {
    if (userProfile && isOpen) {
      setFullName(userProfile.full_name || '');
      setCollegeName(userProfile.college_name || '');
      setBranch(userProfile.branch || 'Computer Science & Engineering (CSE)');
      setYearOfStudy(userProfile.year_of_study || 2);
      setSemester(userProfile.semester || 4);
      setPreferredLanguage(userProfile.preferred_language || 'English');
      setProgrammingProficiency(userProfile.programming_proficiency || 'Beginner');
      setLearningApproach(userProfile.learning_approach || 'Step-by-step explanations');
      setExplanationDepth(userProfile.explanation_depth || 'Balanced');
      setPrimaryGoals(userProfile.primary_goals || ['University Examinations']);
      setSubjectsOfInterest(userProfile.subjects_of_interest || ['Data Structures & Algorithms']);
      setWeakSubjects(userProfile.weak_subjects || []);
      setDailyLearningTime(userProfile.daily_learning_time || '1-2 hours / day');
      setSaveSuccess(false);
      setError('');
    }
  }, [userProfile, isOpen]);

  if (!isOpen) return null;

  const toggleArrayItem = (setter, currentList, item) => {
    if (currentList.includes(item)) {
      setter(currentList.filter((i) => i !== item));
    } else {
      setter([...currentList, item]);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      setSaveSuccess(false);

      await updateProfile({
        full_name: fullName.trim(),
        college_name: collegeName.trim(),
        branch,
        year_of_study: Number(yearOfStudy),
        semester: Number(semester),
        preferred_language: preferredLanguage,
        programming_proficiency: programmingProficiency,
        learning_approach: learningApproach,
        explanation_depth: explanationDepth,
        primary_goals: primaryGoals,
        subjects_of_interest: subjectsOfInterest,
        weak_subjects: weakSubjects,
        daily_learning_time: dailyLearningTime,
        onboarding_completed: true,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const avatar = userProfile?.avatar_url || user?.user_metadata?.avatar_url || '';
  const initial = (fullName || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-2xl max-h-[92vh] rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-zinc-200 text-left flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-3">
            {avatar ? (
              <img
                src={avatar}
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover border border-zinc-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-900 text-white font-bold flex items-center justify-center text-sm">
                {initial}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-zinc-900 text-base">{fullName || 'Student Profile'}</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active Learner
                </span>
              </div>
              <p className="text-xs text-zinc-400">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 pt-3 pb-3 shrink-0 border-b border-zinc-100">
          {[
            { id: 'academic', label: 'Academic Details', icon: GraduationCap },
            { id: 'preferences', label: 'Learning Preferences', icon: Brain },
            { id: 'goals', label: 'Goals & Focus', icon: Compass },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-red-50 text-red-600 text-xs border border-red-200">
            {error}
          </div>
        )}
        {saveSuccess && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs border border-emerald-200 flex items-center gap-2">
            <Check size={14} weight="bold" />
            Preferences updated successfully! AI Tutor will tailor future answers accordingly.
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* TAB 1: Academic Details */}
          {activeTab === 'academic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">College / University</label>
                <input
                  type="text"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g. KNIT Sultanpur"
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Branch / Specialization</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 cursor-pointer"
                >
                  {BRANCH_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Academic Year</label>
                  <select
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 cursor-pointer"
                  >
                    {[1, 2, 3, 4].map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Learning Preferences */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">Preferred Language</label>
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setPreferredLanguage(lang)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        preferredLanguage === lang
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Hinglish blends natural Hindi explanations with standard English code and formulas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">Programming Proficiency</label>
                <div className="grid grid-cols-3 gap-2">
                  {PROFICIENCY_OPTIONS.map((prof) => (
                    <button
                      key={prof}
                      type="button"
                      onClick={() => setProgrammingProficiency(prof)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        programmingProficiency === prof
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      {prof}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">Preferred Learning Approach</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {APPROACH_OPTIONS.map((app) => (
                    <button
                      key={app}
                      type="button"
                      onClick={() => setLearningApproach(app)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                        learningApproach === app
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      {app}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">Explanation Depth</label>
                <div className="grid grid-cols-3 gap-2">
                  {DEPTH_OPTIONS.map((dep) => (
                    <button
                      key={dep}
                      type="button"
                      onClick={() => setExplanationDepth(dep)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        explanationDepth === dep
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      {dep}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Goals & Focus */}
          {activeTab === 'goals' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">Primary Goals</label>
                <div className="flex flex-wrap gap-1.5">
                  {GOALS_LIST.map((goal) => {
                    const isSelected = primaryGoals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => toggleArrayItem(setPrimaryGoals, primaryGoals, goal)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        {goal}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">Subjects of Interest</label>
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECTS_LIST.map((sub) => {
                    const isSelected = subjectsOfInterest.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleArrayItem(setSubjectsOfInterest, subjectsOfInterest, sub)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-zinc-800 text-white border-zinc-800'
                            : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2">
                  Subjects Requiring Improvement (Targeted Help)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECTS_LIST.map((sub) => {
                    const isSelected = weakSubjects.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleArrayItem(setWeakSubjects, weakSubjects, sub)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-2 flex items-center gap-1.5">
                  <Clock size={14} className="text-zinc-500" />
                  Target Daily Study Time
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TIME_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDailyLearningTime(t)}
                      className={`p-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                        dailyLearningTime === t
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-3 shrink-0">
          {onRetakeOnboarding && (
            <button
              type="button"
              onClick={onRetakeOnboarding}
              className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <ArrowClockwise size={13} />
              Retake Onboarding Questionnaire
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <CircleNotch size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={14} weight="bold" />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
