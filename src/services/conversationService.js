import { supabase } from '../utils/supabase';

/**
 * Production Service to manage Conversations, Messages, and Topic Mastery with Supabase.
 * Directly communicates with public.conversations, public.messages, and public.student_topic_mastery.
 */
export const conversationService = {
  /**
   * Fetch all conversations for the authenticated user from Supabase.
   */
  async getUserConversations(userId) {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, subject, topic, is_bookmarked, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Error fetching conversations from Supabase:', err);
      return [];
    }
  },

  /**
   * Fetch chronological messages for a conversation thread from Supabase.
   */
  async getMessages(conversationId) {
    if (!conversationId) return [];

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, role, content, cards, key_insight, feedback, metadata, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Error fetching messages for conversation:', conversationId, err);
      return [];
    }
  },

  /**
   * Create a new conversation thread in Supabase.
   */
  async createConversation(userId, { title, subject = 'General', topic = '' }) {
    if (!userId) throw new Error('User ID is required');

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: title || 'New Topic Inquiry',
        subject: subject || 'General',
        topic: topic || title || 'General Inquiry',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Save a user or assistant message to Supabase.
   */
  async saveMessage({ conversationId, senderId = null, role, content, cards = [], keyInsight = null, metadata = {} }) {
    if (!conversationId || !content) return null;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          role,
          content,
          cards,
          key_insight: keyInsight,
          metadata,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversations.updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return data;
    } catch (err) {
      console.error('Failed to save message to Supabase:', err);
      return null;
    }
  },

  /**
   * Toggle bookmark status of a conversation in Supabase.
   */
  async toggleBookmark(conversationId, currentStatus) {
    if (!conversationId) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ is_bookmarked: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) throw error;
      return !currentStatus;
    } catch (err) {
      console.error('Failed to toggle bookmark in Supabase:', err);
      return currentStatus;
    }
  },

  /**
   * Save Thumbs Up / Down feedback on an explanation in Supabase.
   */
  async saveFeedback(messageId, feedback) {
    if (!messageId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ feedback })
        .eq('id', messageId);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to save message feedback in Supabase:', err);
    }
  },

  /**
   * Fetch live topic mastery records for the student from Supabase.
   */
  async getTopicMastery(userId, subject = null) {
    if (!userId) return [];

    try {
      let query = supabase
        .from('student_topic_mastery')
        .select('id, subject, topic_name, mastery_percentage, status, next_review_at')
        .eq('user_id', userId)
        .order('mastery_percentage', { ascending: false });

      if (subject) {
        query = query.eq('subject', subject);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((d) => ({
        id: d.id,
        name: d.topic_name,
        mastery: d.mastery_percentage,
        status: d.status,
        nextReviewAt: d.next_review_at,
      }));
    } catch (err) {
      console.warn('Failed to load topic mastery from Supabase:', err);
      return [];
    }
  },
};

export default conversationService;
