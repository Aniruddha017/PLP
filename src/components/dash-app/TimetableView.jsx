import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  CalendarBlank,
  CalendarCheck,
  Clock,
  Sparkle,
  Plus,
  Trash,
  Check,
  CheckCircle,
  ArrowClockwise,
  ArrowRight,
  CircleNotch,
  ChatCircleDots,
  Brain,
  Books,
  GraduationCap,
  WarningCircle,
  X,
  Play,
} from '../icons';
import { timetableService } from '../../services/timetableService';

const TYPE_STYLES = {
  study: {
    bg: 'bg-blue-50/80',
    border: 'border-blue-200/80',
    text: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    label: '📖 Study',
  },
  practice: {
    bg: 'bg-emerald-50/80',
    border: 'border-emerald-200/80',
    text: 'text-emerald-900',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    label: '🎯 Practice',
  },
  review: {
    bg: 'bg-amber-50/80',
    border: 'border-amber-200/80',
    text: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    label: '🔄 Review',
  },
  quiz: {
    bg: 'bg-purple-50/80',
    border: 'border-purple-200/80',
    text: 'text-purple-900',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    label: '🏆 Quiz',
  },
  break: {
    bg: 'bg-zinc-100/70',
    border: 'border-zinc-200/80',
    text: 'text-zinc-600',
    badge: 'bg-zinc-200 text-zinc-700 border-zinc-300',
    label: '☕ Break',
  },
};

const PRIORITY_BADGES = {
  high: 'bg-rose-50 text-rose-700 border-rose-200',
  medium: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  low: 'bg-zinc-50 text-zinc-500 border-zinc-200',
};

export const TimetableView = ({ onStartChat, onOpenQuiz, onOpenProfile }) => {
  const { userProfile } = useAuth();

  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [activeDayFilter, setActiveDayFilter] = useState('all'); // 'all' | 'Monday' ...

  // Slot Editing / Creating State
  const [editingSlot, setEditingSlot] = useState(null); // { day, slotIndex, slot }
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadActiveTimetable();
  }, []);

  const loadActiveTimetable = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await timetableService.getActiveTimetable();
      setTimetable(data || null);
    } catch (err) {
      console.warn('[TimetableView] Failed to fetch active timetable:', err);
      setError(err.message || 'Failed to load timetable.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      const newTimetable = await timetableService.generateTimetable({
        title: userProfile?.year_of_study
          ? `Year ${userProfile.year_of_study} Study Schedule`
          : 'Personalized Study Timetable',
      });
      setTimetable(newTimetable);
    } catch (err) {
      console.error('[TimetableView] Generation error:', err);
      setError(err.message || 'Failed to generate timetable. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Stale detection
  const isStale = Boolean(
    timetable?.generation_context &&
      userProfile &&
      (timetable.generation_context.daily_learning_time !== userProfile.daily_learning_time ||
        timetable.generation_context.year_of_study !== userProfile.year_of_study ||
        JSON.stringify(timetable.generation_context.weak_subjects || []) !==
          JSON.stringify(userProfile.weak_subjects || []))
  );

  // Slot Edit Handler
  const handleSaveSlotEdit = async () => {
    if (!editingSlot || !timetable) return;
    const { day, slotIndex, slot } = editingSlot;

    const updatedSchedule = timetable.schedule.map((d) => {
      if (d.day !== day) return d;
      const updatedSlots = [...d.slots];
      if (slotIndex >= 0) {
        updatedSlots[slotIndex] = slot;
      } else {
        updatedSlots.push(slot);
      }
      return { ...d, slots: updatedSlots };
    });

    try {
      setSavingEdit(true);
      const updated = await timetableService.updateTimetable(timetable.id, {
        schedule: updatedSchedule,
      });
      setTimetable(updated);
      setEditingSlot(null);
    } catch (err) {
      console.error('[TimetableView] Error updating slot:', err);
      alert(err.message || 'Failed to save slot changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete a slot
  const handleDeleteSlot = async (day, slotIndex) => {
    if (!timetable || !window.confirm('Delete this study slot?')) return;
    const updatedSchedule = timetable.schedule.map((d) => {
      if (d.day !== day) return d;
      const updatedSlots = d.slots.filter((_, idx) => idx !== slotIndex);
      return { ...d, slots: updatedSlots };
    });

    try {
      const updated = await timetableService.updateTimetable(timetable.id, {
        schedule: updatedSchedule,
      });
      setTimetable(updated);
    } catch (err) {
      console.error('[TimetableView] Error deleting slot:', err);
    }
  };

  const scheduleDays = timetable?.schedule || [];
  const displayedDays =
    activeDayFilter === 'all'
      ? scheduleDays
      : scheduleDays.filter((d) => d.day === activeDayFilter);

  // Stats calculation
  const totalSlots = scheduleDays.reduce((acc, d) => acc + (d.slots?.length || 0), 0);
  const totalStudySlots = scheduleDays.reduce(
    (acc, d) => acc + (d.slots?.filter((s) => s.type !== 'break').length || 0),
    0
  );
  const daysCount = scheduleDays.length || 6;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white h-full overflow-hidden select-text text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200/80 px-6 py-4 bg-zinc-50/60 shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-2xs shrink-0">
            <CalendarBlank size={19} weight="fill" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-zinc-900">AI Study Timetable</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                <Sparkle size={10} weight="fill" />
                Adaptive Pacing
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Curated using your B.Tech CS semester curriculum, weak topics, and daily target of{' '}
              <strong className="text-zinc-700 font-semibold">
                {userProfile?.daily_learning_time || '1-2 hours / day'}
              </strong>
              .
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <Brain size={14} />
              <span>Preferences</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-black transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
          >
            {generating ? (
              <>
                <CircleNotch size={14} className="animate-spin" />
                <span>Designing Schedule...</span>
              </>
            ) : (
              <>
                <ArrowClockwise size={14} weight="bold" />
                <span>{timetable ? 'Regenerate Timetable' : 'Generate Timetable'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stale Context Banner */}
      {isStale && (
        <div className="bg-amber-50 border-b border-amber-200/80 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <WarningCircle size={15} weight="fill" className="text-amber-600 shrink-0" />
            <span>
              Your profile preferences or weak subjects have changed since this schedule was created.
            </span>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="font-bold underline hover:text-black cursor-pointer text-[11px]"
          >
            Regenerate Now
          </button>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {loading ? (
          <div className="py-24 text-center text-zinc-400 space-y-3">
            <CircleNotch size={28} className="animate-spin text-zinc-600 mx-auto" />
            <p className="text-xs font-medium">Loading your weekly timetable...</p>
          </div>
        ) : error && !timetable ? (
          <div className="py-16 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <WarningCircle size={24} weight="bold" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900">Unable to load timetable</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={handleGenerate}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-black"
            >
              <Sparkle size={14} weight="fill" />
              <span>Generate Timetable with AI</span>
            </button>
          </div>
        ) : !timetable || scheduleDays.length === 0 ? (
          /* Empty State */
          <div className="py-20 text-center max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center mx-auto shadow-2xs">
              <CalendarBlank size={28} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">No Active Timetable</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Generate an intelligent weekly study schedule calibrated to your engineering semester,
                daily available hours, and priority subjects.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-black shadow-md transition-all cursor-pointer active:scale-95"
            >
              {generating ? (
                <>
                  <CircleNotch size={14} className="animate-spin" />
                  <span>Synthesizing Academic Pacing...</span>
                </>
              ) : (
                <>
                  <Sparkle size={14} weight="fill" />
                  <span>Generate AI Timetable</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            {/* Meta Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  Weekly Study Load
                </span>
                <p className="text-lg font-bold text-zinc-900 font-mono">
                  {totalStudySlots} Sessions
                </p>
                <p className="text-[10px] text-zinc-500">Across {daysCount} active days</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  Target Daily Time
                </span>
                <p className="text-lg font-bold text-zinc-900 font-mono">
                  {userProfile?.daily_learning_time || '1-2 hrs / day'}
                </p>
                <p className="text-[10px] text-zinc-500">Calibrated to retention curve</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  Focus Subjects
                </span>
                <p className="text-lg font-bold text-zinc-900 font-mono truncate">
                  {userProfile?.weak_subjects?.length
                    ? `${userProfile.weak_subjects.length} Priority`
                    : 'Balanced'}
                </p>
                <p className="text-[10px] text-zinc-500 truncate">
                  {userProfile?.weak_subjects?.join(', ') || 'All subjects evenly'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  Academic Baseline
                </span>
                <p className="text-lg font-bold text-zinc-900 font-mono">
                  Year {userProfile?.year_of_study || 2} Sem {userProfile?.semester || 4}
                </p>
                <p className="text-[10px] text-zinc-500 truncate">{userProfile?.branch || 'CSE'}</p>
              </div>
            </div>

            {/* Day Filter Pills */}
            <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pr-2">
                {['all', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
                  (day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setActiveDayFilter(day)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                        activeDayFilter === day
                          ? 'bg-zinc-900 text-white shadow-2xs'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {day === 'all' ? 'Full Week' : day}
                    </button>
                  )
                )}
              </div>

              {/* Legend */}
              <div className="hidden lg:flex items-center gap-2 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Study
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Practice
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Review
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500" /> Quiz
                </span>
              </div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedDays.map((dayData) => {
                const slots = dayData.slots || [];
                return (
                  <div
                    key={dayData.day}
                    className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs flex flex-col overflow-hidden"
                  >
                    {/* Day Card Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 border-b border-zinc-200/70">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 text-sm">{dayData.day}</span>
                        <span className="text-[10px] font-semibold text-zinc-400 bg-white px-2 py-0.5 rounded-full border border-zinc-200">
                          {slots.length} slots
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingSlot({
                            day: dayData.day,
                            slotIndex: -1,
                            slot: {
                              id: `custom-${Date.now()}`,
                              start_time: '18:00',
                              end_time: '19:00',
                              subject: 'Data Structures & Algorithms',
                              topic: 'Practice Session',
                              type: 'study',
                              priority: 'medium',
                              notes: '',
                            },
                          })
                        }
                        title="Add Slot"
                        className="text-zinc-400 hover:text-zinc-900 p-1 rounded hover:bg-zinc-200/60 transition-colors cursor-pointer"
                      >
                        <Plus size={14} weight="bold" />
                      </button>
                    </div>

                    {/* Slots List */}
                    <div className="p-3 space-y-2.5 flex-1">
                      {slots.length === 0 ? (
                        <div className="py-8 text-center text-zinc-400 text-xs">
                          Rest &amp; Revision Day
                        </div>
                      ) : (
                        slots.map((slot, sIdx) => {
                          const style = TYPE_STYLES[slot.type] || TYPE_STYLES.study;
                          const priorityStyle =
                            PRIORITY_BADGES[slot.priority] || PRIORITY_BADGES.medium;

                          return (
                            <div
                              key={slot.id || sIdx}
                              className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${style.bg} ${style.border}`}
                            >
                              {/* Slot Top Bar: Time & Type Badge */}
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 text-zinc-600 font-mono text-[11px] font-semibold">
                                  <Clock size={12} className="text-zinc-400" />
                                  <span>
                                    {slot.start_time} - {slot.end_time}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${priorityStyle}`}
                                  >
                                    {slot.priority}
                                  </span>
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style.badge}`}
                                  >
                                    {style.label}
                                  </span>
                                </div>
                              </div>

                              {/* Slot Subject & Topic */}
                              <div>
                                <h4 className="font-bold text-zinc-900 text-xs leading-snug">
                                  {slot.subject}
                                </h4>
                                {slot.topic && (
                                  <p className="text-[11px] text-zinc-600 font-medium mt-0.5">
                                    {slot.topic}
                                  </p>
                                )}
                              </div>

                              {/* Notes */}
                              {slot.notes && (
                                <p className="text-[10.5px] text-zinc-500 leading-relaxed italic bg-white/60 p-1.5 rounded border border-zinc-200/50">
                                  {slot.notes}
                                </p>
                              )}

                              {/* Action Footer */}
                              {slot.type !== 'break' && (
                                <div className="flex items-center justify-between pt-1 border-t border-zinc-200/50">
                                  <div className="flex items-center gap-1.5">
                                    {onStartChat && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onStartChat(slot.subject, slot.topic || slot.subject)
                                        }
                                        className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-zinc-800 hover:text-black bg-white px-2 py-1 rounded-lg border border-zinc-200 hover:border-zinc-400 transition-colors cursor-pointer shadow-2xs"
                                      >
                                        <ChatCircleDots size={12} weight="bold" />
                                        <span>Chat</span>
                                      </button>
                                    )}

                                    {onOpenQuiz && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onOpenQuiz(slot.subject, slot.topic || slot.subject)
                                        }
                                        className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-purple-800 hover:text-purple-950 bg-white px-2 py-1 rounded-lg border border-purple-200 hover:border-purple-300 transition-colors cursor-pointer shadow-2xs"
                                      >
                                        <Play size={10} weight="fill" />
                                        <span>Quiz</span>
                                      </button>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingSlot({
                                          day: dayData.day,
                                          slotIndex: sIdx,
                                          slot: { ...slot },
                                        })
                                      }
                                      className="text-[10.5px] text-zinc-500 hover:text-zinc-800 hover:underline px-1 py-0.5 cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSlot(dayData.day, sIdx)}
                                      className="text-zinc-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                    >
                                      <Trash size={12} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Edit Slot Modal */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-zinc-200 text-left space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-bold text-sm text-zinc-900">
                {editingSlot.slotIndex >= 0 ? 'Edit Study Slot' : 'Add New Study Slot'} —{' '}
                {editingSlot.day}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="text-zinc-400 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-semibold mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editingSlot.slot.start_time}
                    onChange={(e) =>
                      setEditingSlot({
                        ...editingSlot,
                        slot: { ...editingSlot.slot, start_time: e.target.value },
                      })
                    }
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-semibold mb-1">End Time</label>
                  <input
                    type="time"
                    value={editingSlot.slot.end_time}
                    onChange={(e) =>
                      setEditingSlot({
                        ...editingSlot,
                        slot: { ...editingSlot.slot, end_time: e.target.value },
                      })
                    }
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Subject</label>
                <input
                  type="text"
                  value={editingSlot.slot.subject}
                  onChange={(e) =>
                    setEditingSlot({
                      ...editingSlot,
                      slot: { ...editingSlot.slot, subject: e.target.value },
                    })
                  }
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Topic</label>
                <input
                  type="text"
                  value={editingSlot.slot.topic || ''}
                  onChange={(e) =>
                    setEditingSlot({
                      ...editingSlot,
                      slot: { ...editingSlot.slot, topic: e.target.value },
                    })
                  }
                  placeholder="e.g. Dynamic Programming & Memoization"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-semibold mb-1">Slot Type</label>
                  <select
                    value={editingSlot.slot.type}
                    onChange={(e) =>
                      setEditingSlot({
                        ...editingSlot,
                        slot: { ...editingSlot.slot, type: e.target.value },
                      })
                    }
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900 cursor-pointer"
                  >
                    <option value="study">📖 Study Session</option>
                    <option value="practice">🎯 Practice Problems</option>
                    <option value="review">🔄 Spaced Review</option>
                    <option value="quiz">🏆 Diagnostic Quiz</option>
                    <option value="break">☕ Rest / Break</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-600 font-semibold mb-1">Priority</label>
                  <select
                    value={editingSlot.slot.priority}
                    onChange={(e) =>
                      setEditingSlot({
                        ...editingSlot,
                        slot: { ...editingSlot.slot, priority: e.target.value },
                      })
                    }
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900 cursor-pointer"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Notes &amp; Hints</label>
                <textarea
                  rows={2}
                  value={editingSlot.slot.notes || ''}
                  onChange={(e) =>
                    setEditingSlot({
                      ...editingSlot,
                      slot: { ...editingSlot.slot, notes: e.target.value },
                    })
                  }
                  placeholder="Derive asymptotic bounds, check edge cases..."
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSlotEdit}
                disabled={savingEdit}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white hover:bg-black transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableView;
