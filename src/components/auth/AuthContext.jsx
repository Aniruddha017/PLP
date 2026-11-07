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
  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setUserProfile(null);
      return;
    }
    try {
      const profile = await authService.getUserProfile(userId);
      setUserProfile(profile);
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
          await loadProfile(verifiedUser.id);
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
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (newSession?.user?.id) {
          await loadProfile(newSession.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        setIsPasswordRecovery(false);
      }

      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email, password) => {
    const data = await authService.signInWithEmail(email, password);
    if (data?.user?.id) {
      await loadProfile(data.user.id);
    }
    return data;
  };

  const signInWithGoogle = async () => {
    return authService.signInWithGoogle();
  };

  const signUp = async (email, password, fullName = '') => {
    return authService.signUpWithEmail(email, password, fullName);
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
      await loadProfile(user.id);
    }
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
