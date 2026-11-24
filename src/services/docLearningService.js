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
    console.warn('[DocLearningService] Session retrieval warning:', err);
  }
  return {};
}

export const docLearningService = {
  /**
   * Upload and validate a lecture note or textbook (PDF, DOCX, PPTX, TXT).
   */
  async uploadDocument(file) {
    const authHeaders = await getAuthHeader();
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        ...authHeaders,
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to upload document' }));
      throw new Error(err.detail || 'Upload failed');
    }

    return res.json();
  },

  /**
   * List all documents uploaded by the user.
   */
  async listDocuments() {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/documents/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch documents');
    }

    return res.json();
  },

  /**
   * Get metadata and details for a single document.
   */
  async getDocument(docId) {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/documents/${docId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch document details');
    }

    return res.json();
  },

  /**
   * Chat with document context (Tutor Agent).
   */
  async chatWithDocument({ documentId, message, chatHistory = [] }) {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/documents/${documentId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        message,
        chat_history: chatHistory,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Chat request failed' }));
      throw new Error(err.detail || 'Failed to chat with document');
    }

    return res.json();
  },

  /**
   * Fetch comprehensive document summary, formula sheet, and revision notes.
   */
  async getDocumentSummary(documentId) {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/documents/${documentId}/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to generate summary');
    }

    return res.json();
  },

  /**
   * Generate exam questions (MCQ, Short Answer, Descriptive).
   */
  async generateQuestions({ documentId, difficulty = 'Medium', topic = null }) {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/documents/${documentId}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ difficulty, topic }),
    });

    if (!res.ok) {
      throw new Error('Failed to generate question bank');
    }

    return res.json();
  },

  /**
   * Generate diagnostic interactive quiz questions.
   */
  async generateQuiz({ documentId, numQuestions = 5 }) {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/documents/${documentId}/quiz/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ num_questions: numQuestions }),
    });

    if (!res.ok) {
      throw new Error('Failed to generate quiz');
    }

    return res.json();
  },

  /**
   * Evaluate student quiz responses and diagnose weak topics.
   */
  async evaluateQuiz({ documentId, questions, answers }) {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/documents/${documentId}/quiz/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ questions, answers }),
    });

    if (!res.ok) {
      throw new Error('Failed to evaluate quiz');
    }

    return res.json();
  },

  /**
   * Delete an uploaded document.
   */
  async deleteDocument(documentId) {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to delete document');
    }

    return res.json();
  },
};

export default docLearningService;
