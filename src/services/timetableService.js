import { supabase } from '../utils/supabase';

const BASE_URL =
  import.meta.env.VITE_CHATBOT_API_URL ||
  (typeof window !== 'undefined' ? '/api/v1' : 'http://127.0.0.1:8000/api/v1');

async function getAuthHeader() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch (err) {
    console.warn('[TimetableService] Session retrieval warning:', err);
  }
  return {};
}

export const timetableService = {
  /**
   * Retrieves the current active timetable for the logged-in student.
   */
  async getActiveTimetable() {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/timetable/active`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch active timetable (${res.status})`);
    }

    return await res.json();
  },

  /**
   * Lists all saved timetables for the student.
   */
  async listTimetables() {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/timetable/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to list timetables (${res.status})`);
    }

    return await res.json();
  },

  /**
   * Triggers the AI timetable generator incorporating profile, curriculum, and mastery.
   */
  async generateTimetable({ title = null, focusSubjects = null, targetExamDate = null } = {}) {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/timetable/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        title,
        focus_subjects: focusSubjects,
        target_exam_date: targetExamDate,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Timetable generation failed (${res.status})`);
    }

    return await res.json();
  },

  /**
   * Updates an existing timetable (e.g. edited slots, title, or active status).
   */
  async updateTimetable(timetableId, payload) {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/timetable/${timetableId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Failed to update timetable (${res.status})`);
    }

    return await res.json();
  },

  /**
   * Deletes a timetable by ID.
   */
  async deleteTimetable(timetableId) {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/timetable/${timetableId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Failed to delete timetable (${res.status})`);
    }

    return await res.json();
  },
};

export default timetableService;
