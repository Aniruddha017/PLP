import { supabase } from '../utils/supabase';

/**
 * Production Authentication Service for AI Tutor
 * Handles Email/Password, Google OAuth, Password Reset, and User Profile sync.
 */
export const authService = {
  /**
   * Register a new user with email and password
   * Stores full_name in raw_user_meta_data which triggers automatic profile creation.
   */
  async signUpWithEmail(email, password, fullName = '') {
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: trimmedName,
          name: trimmedName,
        },
      },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign in an existing user with email and password
   */
  async signInWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Initiate Google OAuth sign-in with redirect back to the app dashboard
   */
  async signInWithGoogle() {
    // Dynamic origin supports localhost during dev and production domain when deployed
    const origin = window.location.origin;
    const redirectUrl = `${origin}/app`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Send password reset recovery link to the user's email
   */
  async sendPasswordReset(email) {
    const origin = window.location.origin;
    const redirectUrl = `${origin}/forgot-password`;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Update password for an authenticated session or recovery session
   */
  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign out current user and clear local session storage
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get the current authenticated user
   */
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  /**
   * Get current auth session
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * Fetch profile details from public.profiles for a given user ID
   */
  async getUserProfile(userId) {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, learning_goal, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Could not fetch user profile:', error.message);
      return null;
    }
    return data;
  },

  /**
   * Update user profile attributes (full_name, learning_goal, avatar_url)
   */
  async updateUserProfile(userId, updates) {
    if (!userId) throw new Error('User ID is required to update profile');

    const safeUpdates = {};
    if (updates.full_name !== undefined) safeUpdates.full_name = updates.full_name;
    if (updates.avatar_url !== undefined) safeUpdates.avatar_url = updates.avatar_url;
    if (updates.learning_goal !== undefined) safeUpdates.learning_goal = updates.learning_goal;
    safeUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('id', userId)
      .select('id, email, full_name, avatar_url, learning_goal, created_at, updated_at')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Subscribe to auth state changes (SIGNED_IN, SIGNED_OUT, PASSWORD_RECOVERY, TOKEN_REFRESHED)
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default authService;
