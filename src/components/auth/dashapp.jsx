import { useAuth } from './AuthContext';
import { DashApp } from '../dash-app/DashApp';
import { LoginView } from './LoginView';
import { CircleNotch } from '../icons';
import Logo from '../Logo';

export const DashboardApp = ({ onNavigateToLogin, onNavigateToRegister, onNavigateToForgotPassword, onNavigateToHome }) => {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#f0f2f5] text-zinc-900 flex flex-col items-center justify-center p-6 relative select-none">
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#e6ebf2] shadow-[6px_6px_14px_#c2c9d4,-6px_-6px_14px_#ffffff] mb-1">
            <Logo dark className="w-14 h-14 !rounded-full shadow-sm" />
          </div>
          <div className="flex items-center gap-2.5 text-sm text-zinc-600 font-medium">
            <CircleNotch size={18} className="animate-spin text-zinc-900" />
            <span>Connecting to AI Tutor...</span>
          </div>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show LoginView
  if (!user) {
    return (
      <LoginView
        onNavigateToRegister={onNavigateToRegister}
        onNavigateToForgotPassword={onNavigateToForgotPassword}
        onNavigateToHome={onNavigateToHome}
      />
    );
  }

  // Primary Learning App Console
  return (
    <DashApp
      onSignOut={async () => {
        if (user && signOut) {
          try {
            await signOut();
          } catch (e) {
            console.error('Sign out error:', e);
          }
        }
        if (onNavigateToLogin) {
          onNavigateToLogin();
        } else {
          window.history.pushState(null, '', '/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }}
    />
  );
};

export const DashAppAuth = DashboardApp;
export const dashapp = DashboardApp;
export default DashboardApp;
