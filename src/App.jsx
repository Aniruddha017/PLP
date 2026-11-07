import { useState, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Services from './components/Services';
import Footer from './components/Footer';
import { AuthProvider, useAuth } from './components/auth/AuthContext';
import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';
import { ForgotPasswordView } from './components/auth/ForgotPasswordView';
import { DashApp } from './components/dash-app/DashApp';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import NotFoundPage from './pages/NotFoundPage';
import { CircleNotch } from './components/icons';
import Logo from './components/Logo';

// Resolves current page route and section from window location with clean URLs (no hashes)
function resolveRoute() {
  if (typeof window === 'undefined') return { page: 'home', section: null };

  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const hash = window.location.hash || '';
  const search = window.location.search || '';

  // 0. Handle Supabase Auth Redirects (Recovery & OAuth)
  if (hash.includes('type=recovery') || search.includes('type=recovery')) {
    return { page: 'forgot-password', section: null };
  }

  // 1. Immediately clean up and normalize hash-based or alias auth URLs:
  if (hash === '#signup' || hash === '#register' || pathname === '/signup') {
    if (window.location.hash || pathname !== '/register') {
      window.history.replaceState(null, '', '/register');
    }
    return { page: 'register', section: null };
  }

  if (hash === '#login') {
    if (window.location.hash) {
      window.history.replaceState(null, '', '/login');
    }
    return { page: 'login', section: null };
  }

  if (hash === '#forgot-password' || hash === '#reset-password' || pathname === '/reset-password') {
    if ((window.location.hash && !hash.includes('type=')) || pathname !== '/forgot-password') {
      window.history.replaceState(null, '', '/forgot-password');
    }
    return { page: 'forgot-password', section: null };
  }

  if (hash === '#dashboard' || hash.startsWith('#dashboard') || pathname === '/dashboard' || pathname.startsWith('/dashboard')) {
    if (window.location.hash || pathname !== '/app') {
      window.history.replaceState(null, '', '/app');
    }
    return { page: 'app', section: null };
  }

  // 2. Direct clean path matching:
  if (pathname === '/login') {
    return { page: 'login', section: null };
  }

  if (pathname === '/register') {
    return { page: 'register', section: null };
  }

  if (pathname === '/forgot-password') {
    return { page: 'forgot-password', section: null };
  }

  if (pathname === '/app' || pathname.startsWith('/app/')) {
    return { page: 'app', section: null };
  }

  if (pathname === '/privacy' || pathname === '/privacy-policy') {
    return { page: 'privacy', section: null };
  }

  if (pathname === '/terms' || pathname === '/terms-and-conditions') {
    return { page: 'terms', section: null };
  }

  // Root Homepage
  if (pathname === '/') {
    if (hash === '#404') {
      return { page: 'not-found', section: null };
    }
    if (hash === '#about' || hash === '#services') {
      return { page: 'home', section: hash };
    }
    return { page: 'home', section: null };
  }

  // Any unrecognized path -> 404 Not Found
  return { page: 'not-found', section: null };
}

function AppContent() {
  const lenisRef = useRef(null);
  const [route, setRoute] = useState(resolveRoute);
  const { user, loading, signOut } = useAuth();

  const navigate = (toPath) => {
    window.history.pushState(null, '', toPath);
    setRoute(resolveRoute());
    window.scrollTo(0, 0);
  };

  // Resolved active page accounting for route guards without cascading renders
  const activePage = (() => {
    if (loading) return route.page;
    if (route.page === 'app' && !user) return 'login';
    if (user && (route.page === 'login' || route.page === 'register')) return 'app';
    return route.page;
  })();

  // Synchronize URL history with guarded route
  useEffect(() => {
    if (!loading) {
      if (route.page === 'app' && !user) {
        window.history.replaceState(null, '', '/login');
      } else if (user && (route.page === 'login' || route.page === 'register')) {
        window.history.replaceState(null, '', '/app');
      }
    }
  }, [route.page, user, loading]);

  // Sync route on browser popstate and hashchange
  useEffect(() => {
    const handleNavigation = () => {
      const current = resolveRoute();
      setRoute(current);

      // Scroll handling for homepage anchors
      if (current.page === 'home') {
        if (current.section) {
          setTimeout(() => {
            const el = document.querySelector(current.section);
            if (el) {
              if (lenisRef.current) {
                lenisRef.current.scrollTo(el);
              } else {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }
          }, 60);
        } else {
          window.scrollTo(0, 0);
        }
      } else {
        window.scrollTo(0, 0);
      }
    };

    // Run initial URL normalization
    handleNavigation();

    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  // Lenis smooth scroll for Homepage only
  useEffect(() => {
    if (route.page !== 'home') {
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lenis = null;
    let rafId;

    if (!prefersReducedMotion) {
      lenis = new Lenis({
        lerp: 0.1,
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.0,
      });

      lenisRef.current = lenis;

      const raf = (time) => {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    }

    // Intercept clicks on links for smooth clean-path navigation without reloads
    const handleAnchorClick = (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;

      // App / Dashboard navigation: redirect to /login if unauthenticated
      if (
        href === '/app' ||
        href.startsWith('/app') ||
        href === '/dashboard' ||
        href.startsWith('/dashboard') ||
        href === '#dashboard'
      ) {
        e.preventDefault();
        if (!user) {
          navigate('/login');
        } else {
          navigate('/app');
        }
        return;
      }

      // Clean auth routes
      if (href === '/login' || href === '#login') {
        e.preventDefault();
        navigate('/login');
        return;
      }

      if (href === '/register' || href === '/signup' || href === '#register' || href === '#signup') {
        e.preventDefault();
        navigate('/register');
        return;
      }

      if (href === '/forgot-password' || href === '/reset-password' || href === '#forgot-password' || href === '#reset-password') {
        e.preventDefault();
        navigate('/forgot-password');
        return;
      }

      // Legal pages
      if (href === '/privacy' || href === '/privacy-policy') {
        e.preventDefault();
        navigate('/privacy');
        return;
      }

      if (href === '/terms' || href === '/terms-and-conditions') {
        e.preventDefault();
        navigate('/terms');
        return;
      }

      // Home link: reset URL to '/' (no '#')
      if (href === '#home' || href === '/') {
        e.preventDefault();
        navigate('/');
        return;
      }

      // Homepage section anchors: only use /#section
      if (href.startsWith('#') && href.length > 1) {
        const targetElement = document.querySelector(href);
        if (targetElement) {
          e.preventDefault();
          window.history.pushState(null, '', `/${href}`);
          setRoute({ page: 'home', section: href });
          if (lenisRef.current) {
            lenisRef.current.scrollTo(targetElement, { offset: 0, duration: 1.2 });
          } else {
            targetElement.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('click', handleAnchorClick);
      if (lenis) lenis.destroy();
      lenisRef.current = null;
    };
  }, [route.page, user]);

  return (
    <div className="app-container min-h-screen bg-[#09090B] text-[#FAFAFA]">
      {/* 1. Main Homepage */}
      {activePage === 'home' && (
        <>
          <Navbar />
          <main>
            <Hero />
            <About />
            <Services />
          </main>
          <Footer />
        </>
      )}

      {/* 2. Login Page (/login) */}
      {activePage === 'login' && (
        <LoginView
          onNavigateToRegister={() => navigate('/register')}
          onNavigateToForgotPassword={() => navigate('/forgot-password')}
          onNavigateToHome={() => navigate('/')}
          onSuccess={() => navigate('/app')}
        />
      )}

      {/* 3. Register / Sign Up Page (/register) */}
      {activePage === 'register' && (
        <RegisterView
          onNavigateToLogin={() => navigate('/login')}
          onNavigateToHome={() => navigate('/')}
          onSuccess={() => navigate('/app')}
        />
      )}

      {/* 4. Forgot Password Page (/forgot-password) */}
      {activePage === 'forgot-password' && (
        <ForgotPasswordView
          onNavigateToLogin={() => navigate('/login')}
          onNavigateToHome={() => navigate('/')}
        />
      )}

      {/* 5. Learning App Console (/app) */}
      {activePage === 'app' && (
        loading ? (
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
        ) : user ? (
          <DashApp
            onSignOut={async () => {
              if (user && signOut) {
                try {
                  await signOut();
                } catch (e) {
                  console.error('Sign out error:', e);
                }
              }
              navigate('/login');
            }}
          />
        ) : null
      )}

      {/* 6. Privacy Policy Page */}
      {activePage === 'privacy' && (
        <PrivacyPolicyPage onBack={() => navigate('/')} />
      )}

      {/* 7. Terms & Conditions Page */}
      {activePage === 'terms' && (
        <TermsPage onBack={() => navigate('/')} />
      )}

      {/* 8. 404 Page Not Found */}
      {activePage === 'not-found' && (
        <NotFoundPage onGoHome={() => navigate('/')} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
