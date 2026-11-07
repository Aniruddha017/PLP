import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Lock, EnvelopeSimple, Eye, EyeSlash, CircleNotch, ArrowRight, ArrowLeft, CheckCircle } from '../icons';
import Logo from '../Logo';

export const ForgotPasswordView = ({ onNavigateToLogin, onNavigateToHome }) => {
  const { resetPassword, updatePassword, isPasswordRecovery, setIsPasswordRecovery } = useAuth();

  // Mode: 'request' (send link) vs 'update' (set new password via recovery link)
  const isUpdateMode = Boolean(
    isPasswordRecovery ||
    (typeof window !== 'undefined' &&
      (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')))
  );

  // Request form state
  const [email, setEmail] = useState('');

  // Update password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Common UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Handle email reset link dispatch
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    try {
      setIsLoading(true);
      await resetPassword(email);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Password reset request error:', err);
      setErrorMessage(err.message || 'Failed to send password reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle setting new password after clicking recovery link
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newPassword) {
      setErrorMessage('Please enter your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    try {
      setIsLoading(true);
      await updatePassword(newPassword);
      setIsSubmitted(true);
      if (setIsPasswordRecovery) {
        setIsPasswordRecovery(false);
      }
      // Clean recovery fragment from URL
      if (typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (err) {
      console.error('Password update error:', err);
      setErrorMessage(err.message || 'Failed to update your password. Please try requesting a new reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f0f2f5] text-zinc-800 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      <div className="w-full max-w-[430px] relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <a
            href="/"
            onClick={(e) => {
              if (onNavigateToHome) {
                e.preventDefault();
                onNavigateToHome();
              }
            }}
            className="inline-block group cursor-pointer"
            aria-label="AI Tutor Homepage"
          >
            {/* Neumorphic Brand Logo */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#e6ebf2] shadow-[6px_6px_14px_#c2c9d4,-6px_-6px_14px_#ffffff] mb-2 group-hover:scale-105 transition-transform duration-200">
              <Logo dark className="w-14 h-14 !rounded-full shadow-sm" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl font-sans">
              AI Tutor
            </h1>
          </a>
        </div>

        {/* Neumorphic Main Card */}
        <div className="bg-[#e6ebf2] border border-slate-300/40 rounded-[2rem] p-7 sm:p-9 shadow-[inset_8px_8px_20px_#ffffff,inset_-8px_-8px_20px_#c5ccd6]">
          <div className="pb-4 mb-5 border-b border-zinc-300/60 text-center">
            <h2 className="text-lg font-bold text-zinc-900">
              {isUpdateMode ? 'Create New Password' : 'Reset Password'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isUpdateMode
                ? 'Enter and confirm your new password below'
                : "Enter your email and we'll send you instructions to reset your password"}
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-2xl bg-[#e6ebf2] shadow-[inset_3px_3px_6px_#d9b8b8,inset_-3px_-3px_6px_#ffffff] border border-rose-300/60 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Success State */}
          {isSubmitted ? (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#e6ebf2] shadow-[inset_3px_3px_6px_#bdddc9,inset_-3px_-3px_6px_#ffffff] border border-emerald-300/60 text-emerald-800 text-xs flex items-start gap-3">
                <CheckCircle size={22} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-emerald-900">
                    {isUpdateMode ? 'Password Updated' : 'Reset Link Sent'}
                  </div>
                  <div className="leading-relaxed text-zinc-600">
                    {isUpdateMode ? (
                      'Your password has been changed successfully. You can now sign in to your AI Tutor console.'
                    ) : (
                      <>
                        If an account exists for <strong className="text-zinc-900 font-semibold">{email}</strong>, you will receive password reset instructions shortly.
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="w-full py-2.5 px-5 bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 active:from-black active:to-black text-white font-bold text-base rounded-full transition-[box-shadow] duration-200 ease-out flex items-center justify-center gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),3px_3px_8px_#c5ccd6,-3px_-3px_8px_#ffffff] hover:shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] cursor-pointer border border-zinc-800/80"
                >
                  <ArrowLeft size={16} weight="bold" />
                  <span>Go to Sign In</span>
                </button>
              </div>
            </div>
          ) : isUpdateMode ? (
            /* Mode 2: Set New Password Form */
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5 ml-1">
                  New Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-zinc-900 transition-colors">
                    <Lock size={19} weight="bold" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={isLoading}
                    style={{ outline: 'none' }}
                    className="w-full pl-11 pr-12 py-3 bg-[#e6ebf2] rounded-full text-sm text-zinc-800 placeholder:text-zinc-400 border-0 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff] focus:shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff,0_0_0_1.5px_rgba(24,24,27,0.25)] transition-[box-shadow] duration-150 ease-out font-mono"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-700 active:scale-95 transition-transform cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeSlash size={19} weight="bold" /> : <Eye size={19} weight="bold" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5 ml-1">
                  Confirm New Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-zinc-900 transition-colors">
                    <Lock size={19} weight="bold" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={isLoading}
                    style={{ outline: 'none' }}
                    className="w-full pl-11 pr-12 py-3 bg-[#e6ebf2] rounded-full text-sm text-zinc-800 placeholder:text-zinc-400 border-0 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff] focus:shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff,0_0_0_1.5px_rgba(24,24,27,0.25)] transition-[box-shadow] duration-150 ease-out font-mono"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-700 active:scale-95 transition-transform cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeSlash size={19} weight="bold" /> : <Eye size={19} weight="bold" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-5 bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 active:from-black active:to-black disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none text-white font-bold text-base rounded-full transition-[box-shadow] duration-200 ease-out flex items-center justify-center gap-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),3px_3px_8px_#c5ccd6,-3px_-3px_8px_#ffffff] hover:shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] active:shadow-[inset_0_-4px_8px_rgba(0,0,0,0.32),inset_0_2px_5px_rgba(255,255,255,0.4)] cursor-pointer border border-zinc-800/80 group"
                >
                  {isLoading ? (
                    <>
                      <CircleNotch size={18} className="animate-spin text-zinc-300" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Save New Password</span>
                      <div className="w-5 h-5 flex items-center justify-center pointer-events-none transition-transform duration-200 ease-out group-hover:translate-x-1.5">
                        <ArrowRight size={18} weight="bold" />
                      </div>
                    </>
                  )}
                </button>
              </div>

              {onNavigateToLogin && (
                <div className="pt-2 text-center text-xs text-zinc-500">
                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    className="font-bold text-zinc-800 hover:text-black underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Cancel and Return to Sign In
                  </button>
                </div>
              )}
            </form>
          ) : (
            /* Mode 1: Send Reset Email Form */
            <form onSubmit={handleRequestSubmit} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-2 ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-zinc-900 transition-colors">
                    <EnvelopeSimple size={19} weight="bold" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={isLoading}
                    style={{ outline: 'none' }}
                    className="w-full pl-11 pr-4 py-3 bg-[#e6ebf2] rounded-full text-sm text-zinc-800 placeholder:text-zinc-400 border-0 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff] focus:shadow-[inset_4px_4px_8px_#c8d0db,inset_-4px_-4px_8px_#ffffff,0_0_0_1.5px_rgba(24,24,27,0.25)] transition-[box-shadow] duration-150 ease-out font-medium"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-5 bg-gradient-to-b from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 active:from-black active:to-black disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none text-white font-bold text-base rounded-full transition-[box-shadow] duration-200 ease-out flex items-center justify-center gap-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),3px_3px_8px_#c5ccd6,-3px_-3px_8px_#ffffff] hover:shadow-[inset_0_-3px_6px_rgba(0,0,0,0.22),inset_0_2px_5px_rgba(255,255,255,0.45)] active:shadow-[inset_0_-4px_8px_rgba(0,0,0,0.32),inset_0_2px_5px_rgba(255,255,255,0.4)] cursor-pointer border border-zinc-800/80 group"
                >
                  {isLoading ? (
                    <>
                      <CircleNotch size={18} className="animate-spin text-zinc-300" />
                      <span>Sending Link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <div className="w-5 h-5 flex items-center justify-center pointer-events-none transition-transform duration-200 ease-out group-hover:translate-x-1.5">
                        <ArrowRight size={18} weight="bold" />
                      </div>
                    </>
                  )}
                </button>
              </div>

              {onNavigateToLogin && (
                <div className="pt-2 text-center text-xs text-zinc-500">
                  <span>Remember your password? </span>
                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    className="font-bold text-zinc-800 hover:text-black underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordView;
