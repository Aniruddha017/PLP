import { supabase } from '../utils/supabase';

const CHATBOT_BASE_URL = 
  import.meta.env.VITE_CHATBOT_API_URL || 
  (typeof window !== 'undefined' ? '/api/v1' : 'http://127.0.0.1:8000/api/v1');

/**
 * Microservice client for the Python FastAPI Chatbot Service.
 * Handles JWT bearer authentication, payload dispatch, and health checks.
 */
export const chatbotService = {
  /**
   * Check if the Python microservice is online and healthy.
   */
  async checkHealth() {
    try {
      const url = CHATBOT_BASE_URL.replace(/\/api\/v1\/?$/, '') + '/health';
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Send student message to the Python FastAPI microservice.
   * Transmits conversation_id and student message with Supabase Auth Bearer token.
   */
  async sendMessage({ conversationId, message }) {
    if (!message || !message.trim()) {
      throw new Error('Message cannot be empty');
    }

    // 1. Fetch current authenticated Supabase session JWT
    let token = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || null;
    } catch (err) {
      console.warn('Could not retrieve Supabase session token for microservice:', err);
    }

    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const endpoint = `${CHATBOT_BASE_URL.replace(/\/+$/, '')}/chat/`;

    // 2. Dispatch request to FastAPI microservice with a 15-second timeout
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        conversation_id: conversationId || null,
        message: message.trim(),
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Microservice responded with status ${response.status}: ${errorText || response.statusText}`);
    }

    return await response.json();
  },

  /**
   * Request a structured 5-step learning roadmap for a topic from the Python backend.
   */
  async generateRoadmap({ subject, topic, conversationId = null }) {
    if (!topic) throw new Error('Topic is required');

    let token = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || null;
    } catch (err) {
      console.warn('Could not retrieve Supabase session token for roadmap:', err);
    }

    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const endpoint = `${CHATBOT_BASE_URL.replace(/\/+$/, '')}/roadmap/`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subject: subject || 'Computer Science',
        topic: topic,
        conversation_id: conversationId,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Roadmap error ${response.status}: ${errorText || response.statusText}`);
    }

    return await response.json();
  },

  /**
   * Request adaptive multiple-choice questions for a topic.
   */
  async generateQuiz({ subject, topic, difficulty = 'intermediate', conversationId = null }) {
    if (!topic) throw new Error('Topic is required');

    let token = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || null;
    } catch (err) {
      console.warn('Could not retrieve Supabase session token for quiz generation:', err);
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const endpoint = `${CHATBOT_BASE_URL.replace(/\/+$/, '')}/quiz/generate`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subject: subject || 'Computer Science',
        topic,
        difficulty,
        conversation_id: conversationId,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Quiz generation error ${response.status}: ${errorText || response.statusText}`);
    }

    return await response.json();
  },

  /**
   * Submit and evaluate student quiz answers, updating topic mastery in Supabase.
   */
  async evaluateQuiz({ subject, topic, questions, studentAnswers, conversationId = null }) {
    let token = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || null;
    } catch (err) {
      console.warn('Could not retrieve Supabase session token for quiz evaluation:', err);
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const endpoint = `${CHATBOT_BASE_URL.replace(/\/+$/, '')}/quiz/evaluate`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subject: subject || 'Computer Science',
        topic,
        conversation_id: conversationId,
        questions,
        student_answers: studentAnswers,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Quiz evaluation error ${response.status}: ${errorText || response.statusText}`);
    }

    return await response.json();
  },
};

export default chatbotService;
