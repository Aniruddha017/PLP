import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService } from '../../services/authService';

export const AuthContext = createContext({
  user: null,
  session: null,
  userProfile: null,
  loading: true,
  isPasswordRecovery: false,
  signIn: async () => {},
  signUp: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  updateProfile: async () => {},
  setIsPasswordRecovery: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return hash.includes('type=recovery') || search.includes('type=recovery');
  });

  // Fetch or refresh profile details from public.profiles
  const loadProfile = useCallback(async (userId, fallbackUser = null) => {
    if (!userId) {
      setUserProfile(null);
      return;
    }
    try {
      const profile = await authService.getUserProfile(userId);
      const metaYear = fallbackUser?.user_metadata?.year_of_study;
      const isCompleted = Boolean(
        profile?.onboarding_completed ||
        (profile?.branch && profile?.semester) ||
        (typeof window !== 'undefined' && localStorage.getItem(`onboarding_completed_${userId}`) === 'true')
      );
      if (isCompleted && typeof window !== 'undefined') {
        localStorage.setItem(`onboarding_completed_${userId}`, 'true');
      }

      if (profile) {
        setUserProfile({
          ...profile,
          year_of_study: profile.year_of_study ?? metaYear ?? null,
          onboarding_completed: isCompleted,
        });
      } else if (fallbackUser) {
        setUserProfile({
          id: userId,
          email: fallbackUser.email,
          full_name: fallbackUser.user_metadata?.full_name || fallbackUser.user_metadata?.name || fallbackUser.email?.split('@')[0],
          avatar_url: fallbackUser.user_metadata?.avatar_url || fallbackUser.user_metadata?.picture || '',
          year_of_study: metaYear ?? null,
          onboarding_completed: isCompleted,
        });
      } else {
        setUserProfile(profile);
      }
    } catch (err) {
      console.warn('Failed to load profile for user:', userId, err);
    }
  }, []);

  useEffect(() => {
    // 1. Fetch initial active session with server-side validation
    const initAuth = async () => {
      try {
        const verifiedUser = await authService.getCurrentUser().catch(() => null);
        if (verifiedUser) {
          const currentSession = await authService.getSession().catch(() => null);
          setSession(currentSession);
          setUser(verifiedUser);
          await loadProfile(verifiedUser.id, verifiedUser);
        } else {
          setSession(null);
          setUser(null);
          setUserProfile(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // 2. Listen to auth state transitions
    const { data: { subscription } } = authService.onAuthStateChange(async (event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setLoading(true);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user?.id) {
          await loadProfile(newSession.user.id, newSession.user);
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setUserProfile(null);
        setIsPasswordRecovery(false);
        setLoading(false);
      } else {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const data = await authService.signInWithEmail(email, password);
      if (data?.user?.id) {
        setUser(data.user);
        await loadProfile(data.user.id, data.user);
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    return authService.signInWithGoogle();
  };

  const signUp = async (email, password, fullName = '', yearOfStudy = null) => {
    return authService.signUpWithEmail(email, password, fullName, yearOfStudy);
  };

  const resetPassword = async (email) => {
    return authService.sendPasswordReset(email);
  };

  const updatePassword = async (newPassword) => {
    const result = await authService.updatePassword(newPassword);
    setIsPasswordRecovery(false);
    return result;
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setSession(null);
    setUserProfile(null);
    setIsPasswordRecovery(false);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await loadProfile(user.id, user);
    }
  };

  const updateProfile = async (updates) => {
    if (!user?.id) throw new Error('Not authenticated');
    const updated = await authService.updateUserProfile(user.id, updates);
    if (updated?.onboarding_completed || updates?.onboarding_completed) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      }
    }
    setUserProfile((prev) => ({
      ...(prev || {}),
      ...updated,
      onboarding_completed: Boolean(
        updated?.onboarding_completed ||
        updates?.onboarding_completed ||
        prev?.onboarding_completed
      ),
    }));
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userProfile,
        loading,
        isPasswordRecovery,
        setIsPasswordRecovery,
        signIn,
        signUp,
        resetPassword,
        updatePassword,
        signInWithGoogle,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
