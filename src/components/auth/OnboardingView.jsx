import { useState } from 'react';
import { useAuth } from './AuthContext';
import {
  GraduationCap,
  Brain,
  Compass,
  ArrowRight,
  ArrowLeft,
  Check,
  CircleNotch,
  Sparkle,
  Code,
  Clock,
  Books,
} from '../icons';
import Logo from '../Logo';

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

const YEAR_OPTIONS = [
  { value: 1, label: '1st Year', desc: 'Freshman Foundations & Mathematics' },
  { value: 2, label: '2nd Year', desc: 'Core Data Structures, Algorithms & OOP' },
  { value: 3, label: '3rd Year', desc: 'Systems, Networks, OS, DBMS & GATE Prep' },
  { value: 4, label: '4th Year', desc: 'Advanced Capstone, Placements & System Design' },
];

const LANGUAGE_OPTIONS = [
  {
    id: 'English',
    title: 'English',
    desc: 'Standard global technical English',
    badge: 'Universal',
  },
  {
    id: 'Hinglish',
    title: 'Hinglish (Hindi + English)',
    desc: 'Conversational Hindi explanations with English code & terminology',
    badge: 'Recommended for India',
  },
  {
    id: 'Hindi',
    title: 'Hindi',
    desc: 'Clear Hindi explanation with standard technical formulas',
    badge: 'Native',
  },
];

const PROFICIENCY_OPTIONS = [
  { id: 'Beginner', title: 'Beginner', desc: 'Learning programming syntax, loops, and basic logic' },
  { id: 'Intermediate', title: 'Intermediate', desc: 'Comfortable with OOP, linear data structures, and problem-solving' },
  { id: 'Advanced', title: 'Advanced', desc: 'Skilled in trees, graphs, dynamic programming, and systems' },
];

const APPROACH_OPTIONS = [
  { id: 'Step-by-step explanations', title: 'Step-by-Step Breakdown', desc: 'First principles logic, sequential building blocks' },
  { id: 'Examples', title: 'Code & Real-World Examples', desc: 'Learn primarily by working code snippets and use cases' },
  { id: 'Visual learning', title: 'Visual & Mental Models', desc: 'Diagrams, memory layouts, flowcharts and abstractions' },
  { id: 'Theory', title: 'Mathematical & Theoretical Rigor', desc: 'Theorems, formal proofs, complexity analysis' },
  { id: 'Practical implementation', title: 'Hands-on Implementation', desc: 'Project-focused, architectural patterns' },
];

const DEPTH_OPTIONS = [
  { id: 'Beginner-friendly', title: 'Beginner-Friendly', desc: 'Intuitive analogies without jargon overload' },
  { id: 'Balanced', title: 'Balanced', desc: 'Standard undergraduate syllabus rigor with clarity' },
  { id: 'In-depth', title: 'In-Depth', desc: 'Comprehensive, edge cases, proofs, and hardware internals' },
];

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

export const OnboardingView = ({ onComplete }) => {
  const { userProfile, updateProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State initialized from existing user profile if available
  const [collegeName, setCollegeName] = useState(userProfile?.college_name || 'Kamla Nehru Institute of Technology (KNIT Sultanpur)');
  const [branch, setBranch] = useState(userProfile?.branch || 'Computer Science & Engineering (CSE)');
  const [yearOfStudy, setYearOfStudy] = useState(userProfile?.year_of_study || 2);
  const [semester, setSemester] = useState(userProfile?.semester || 4);

  const [preferredLanguage, setPreferredLanguage] = useState(userProfile?.preferred_language || 'English');
  const [programmingProficiency, setProgrammingProficiency] = useState(userProfile?.programming_proficiency || 'Beginner');
  const [learningApproach, setLearningApproach] = useState(userProfile?.learning_approach || 'Step-by-step explanations');
  const [explanationDepth, setExplanationDepth] = useState(userProfile?.explanation_depth || 'Balanced');

  const [primaryGoals, setPrimaryGoals] = useState(userProfile?.primary_goals || ['University Examinations', 'Campus Placements & Interviews']);
  const [subjectsOfInterest, setSubjectsOfInterest] = useState(userProfile?.subjects_of_interest || ['Data Structures & Algorithms', 'Operating Systems']);
  const [weakSubjects, setWeakSubjects] = useState(userProfile?.weak_subjects || ['Computer Networks']);
  const [dailyLearningTime, setDailyLearningTime] = useState(userProfile?.daily_learning_time || '1-2 hours / day');

  const toggleArrayItem = (setter, currentList, item) => {
    if (currentList.includes(item)) {
      setter(currentList.filter((i) => i !== item));
    } else {
      setter([...currentList, item]);
    }
  };

  const validateStep1 = () => {
    if (!collegeName.trim()) {
      setError('Please enter your college or university name.');
      return false;
    }
    if (!branch) {
      setError('Please select your engineering branch.');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 2) {
      setError('');
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinish = async (skipOptional = false) => {
    setError('');
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        college_name: collegeName.trim(),
        branch,
        year_of_study: Number(yearOfStudy),
        semester: Number(semester),
        programming_proficiency: programmingProficiency,
        learning_approach: learningApproach,
        explanation_depth: explanationDepth,
        preferred_language: preferredLanguage,
        primary_goals: skipOptional ? ['University Examinations'] : primaryGoals,
        subjects_of_interest: skipOptional ? ['Data Structures & Algorithms'] : subjectsOfInterest,
        weak_subjects: skipOptional ? [] : weakSubjects,
        daily_learning_time: dailyLearningTime,
        onboarding_completed: true,
      };

      await updateProfile(payload);
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      setError(err.message || 'Failed to save your preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col items-center justify-center p-4 md:p-8 selection:bg-white selection:text-black">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[600px] h-[600px] bg-zinc-800/20 rounded-full blur-[140px] -z-10" />
      </div>

      <div className="w-full max-w-2xl relative z-10 my-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Logo dark className="w-9 h-9" />
            <span className="font-bold text-lg tracking-tight text-white">AI Tutor</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Personalize Your Learning Experience
          </h1>
          <p className="text-zinc-400 text-sm mt-1.5 max-w-md">
            Help the AI understand your syllabus, technical goals, and explanation style for personalized tutoring.
          </p>

          {/* Stepper Progress Bar */}
          <div className="w-full mt-6 bg-zinc-900 border border-zinc-800/80 rounded-2xl p-3 flex items-center justify-between">
            {[
              { num: 1, title: 'Academic Profile', icon: GraduationCap },
              { num: 2, title: 'Learning Preferences', icon: Brain },
              { num: 3, title: 'Goals & Focus', icon: Compass },
            ].map(({ num, title, icon: StepIcon }) => {
              const isCurrent = step === num;
              const isDone = step > num;
              return (
                <div key={num} className="flex-1 flex items-center gap-2 px-2 first:pl-1 last:pr-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                      isDone
                        ? 'bg-emerald-500 text-black'
                        : isCurrent
                        ? 'bg-white text-black ring-4 ring-white/10'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {isDone ? <Check size={14} weight="bold" /> : num}
                  </div>
                  <div className="hidden sm:block text-left min-w-0">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                      Step {num}
                    </div>
                    <div className={`text-xs font-medium truncate ${isCurrent ? 'text-white' : 'text-zinc-400'}`}>
                      {title}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        {/* Form Container */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl">
          {/* STEP 1: Academic Information */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <GraduationCap className="text-zinc-400" size={20} />
                  Academic Background
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  We use your college and branch to align with your university curriculum.
                </p>
              </div>

              {/* College Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  College / Institute Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g. Kamla Nehru Institute of Technology, Sultanpur"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[11px] text-zinc-500 self-center">Quick Suggestions:</span>
                  {['KNIT Sultanpur', 'AKTU University', 'IIT / NIT'].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCollegeName(item)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Branch Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Branch / Specialization <span className="text-red-400">*</span>
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all cursor-pointer"
                >
                  {BRANCH_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-zinc-900 text-white">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year & Semester Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Year of Study */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Current Academic Year <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {YEAR_OPTIONS.map((y) => (
                      <button
                        key={y.value}
                        type="button"
                        onClick={() => {
                          setYearOfStudy(y.value);
                          setSemester(y.value * 2);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          yearOfStudy === y.value
                            ? 'border-white bg-zinc-800/90 text-white shadow-sm'
                            : 'border-zinc-800/80 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="font-bold text-sm text-white">{y.label}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{y.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Current Semester */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Current Semester <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <button
                        key={sem}
                        type="button"
                        onClick={() => setSemester(sem)}
                        className={`py-3 rounded-xl border text-center font-bold text-sm transition-all ${
                          semester === sem
                            ? 'border-white bg-white text-black'
                            : 'border-zinc-800/80 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        Sem {sem}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Learning Preferences */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Brain className="text-zinc-400" size={20} />
                  Learning Preferences
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Customize how the AI tutor phrases concepts, guides coding problems, and structures answers.
                </p>
              </div>

              {/* Preferred Language */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Preferred Explanation Language <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setPreferredLanguage(lang.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all relative ${
                        preferredLanguage === lang.id
                          ? 'border-white bg-zinc-800/90 text-white'
                          : 'border-zinc-800/80 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-white">{lang.title}</span>
                        {preferredLanguage === lang.id && <Check size={14} className="text-emerald-400" />}
                      </div>
                      <div className="text-[11px] text-zinc-400 leading-snug">{lang.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Programming Proficiency */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Programming Proficiency <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PROFICIENCY_OPTIONS.map((prof) => (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => setProgrammingProficiency(prof.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        programmingProficiency === prof.id
                          ? 'border-white bg-zinc-800/90 text-white'
                          : 'border-zinc-800/80 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-bold text-sm text-white mb-1 flex items-center justify-between">
                        {prof.title}
                        {programmingProficiency === prof.id && <Check size={14} className="text-emerald-400" />}
                      </div>
                      <div className="text-[11px] text-zinc-400 leading-snug">{prof.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Learning Approach */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Preferred Learning Approach <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {APPROACH_OPTIONS.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setLearningApproach(app.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        learningApproach === app.id
                          ? 'border-white bg-zinc-800/90 text-white'
                          : 'border-zinc-800/80 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-bold text-xs text-white mb-0.5">{app.title}</div>
                      <div className="text-[10px] text-zinc-400">{app.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Explanation Depth */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Preferred Explanation Depth
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {DEPTH_OPTIONS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setExplanationDepth(d.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        explanationDepth === d.id
                          ? 'border-white bg-zinc-800/90 text-white'
                          : 'border-zinc-800/80 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-bold text-xs text-white mb-0.5">{d.title}</div>
                      <div className="text-[10px] text-zinc-400">{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Goals & Focus */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Compass className="text-zinc-400" size={20} />
                  Educational Goals & Focus Topics
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Select your primary targets so practice tests, roadmaps, and document learning highlight relevant problem patterns.
                </p>
              </div>

              {/* Primary Goals */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Primary Educational Goals (Select all that apply)
                </label>
                <div className="flex flex-wrap gap-2">
                  {GOALS_LIST.map((goal) => {
                    const isSelected = primaryGoals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => toggleArrayItem(setPrimaryGoals, primaryGoals, goal)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-white text-black border-white shadow-sm'
                            : 'bg-zinc-950/80 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {isSelected && <Check size={12} weight="bold" />}
                        {goal}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subjects of Interest */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Subjects of High Interest
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS_LIST.map((subject) => {
                    const isSelected = subjectsOfInterest.includes(subject);
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleArrayItem(setSubjectsOfInterest, subjectsOfInterest, subject)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-zinc-200 text-black border-zinc-200'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {isSelected && <Check size={12} weight="bold" />}
                        {subject}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weak Subjects / Needs Improvement */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Subjects Requiring Improvement (AI will provide extra scaffolding)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS_LIST.map((subject) => {
                    const isSelected = weakSubjects.includes(subject);
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleArrayItem(setWeakSubjects, weakSubjects, subject)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-amber-400/20 text-amber-200 border-amber-400/40'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {isSelected && <Check size={12} weight="bold" />}
                        {subject}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Daily Learning Commitment */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock size={14} className="text-zinc-400" />
                  Target Daily Study Time
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TIME_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDailyLearningTime(t)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                        dailyLearningTime === t
                          ? 'border-white bg-white text-black'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Actions Bar */}
          <div className="mt-8 pt-6 border-t border-zinc-800/80 flex items-center justify-between gap-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-2 hover:bg-zinc-800/50 transition-all cursor-pointer"
              >
                <ArrowLeft size={14} />
                Back
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              {step === 3 && (
                <button
                  type="button"
                  onClick={() => handleFinish(true)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Skip Non-Essential
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg"
                >
                  Save & Continue
                  <ArrowRight size={14} weight="bold" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleFinish(false)}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <CircleNotch size={14} className="animate-spin" />
                      Finalizing Profile...
                    </>
                  ) : (
                    <>
                      <Sparkle size={14} weight="bold" />
                      Complete Onboarding
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingView;
