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
  async signUpWithEmail(email, password, fullName = '', yearOfStudy = null) {
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();
    const metaData = {
      full_name: trimmedName,
      name: trimmedName,
    };
    if (yearOfStudy) {
      metaData.year_of_study = Number(yearOfStudy);
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: metaData,
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
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Could not fetch user profile:', error.message);
      return null;
    }
    return data;
  },

  /**
   * Update user profile attributes (academic, learning preferences, goals)
   */
  async updateUserProfile(userId, updates) {
    if (!userId) throw new Error('User ID is required to update profile');

    const safeUpdates = {};
    const allowedKeys = [
      'full_name',
      'avatar_url',
      'learning_goal',
      'year_of_study',
      'college_name',
      'branch',
      'semester',
      'programming_proficiency',
      'learning_approach',
      'explanation_depth',
      'preferred_language',
      'primary_goals',
      'subjects_of_interest',
      'weak_subjects',
      'daily_learning_time',
      'onboarding_completed'
    ];

    allowedKeys.forEach((key) => {
      if (updates[key] !== undefined) {
        safeUpdates[key] = updates[key];
      }
    });

    safeUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('id', userId)
      .select('*')
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
