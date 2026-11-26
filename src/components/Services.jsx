import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowUpRight,
  Code,
  TrendUp,
  Stack,
  Terminal,
  Brain,
  Globe,
  FileText,
  Lightning,
  ShieldCheck,
} from './icons';

const EASE_PREMIUM = [0.16, 1, 0.3, 1];

const SUBJECTS = [
  {
    id: 'kcs-301-dsa',
    name: 'Data Structures',
    code: 'KCS-301',
    icon: <Stack size={30} weight="bold" />,
    href: '/app#subjects',
  },
  {
    id: 'kcs-302-coa',
    name: 'Computer Org & Architecture',
    code: 'KCS-302',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-7 h-7 sm:w-8 sm:h-8"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
      </svg>
    ),
    href: '/app#subjects',
  },
  {
    id: 'kcs-303-dstl',
    name: 'Discrete Structures & Logic',
    code: 'KCS-303',
    icon: <Brain size={30} weight="regular" />,
    href: '/app#subjects',
  },
  {
    id: 'kcs-401-os',
    name: 'Operating Systems',
    code: 'KCS-401',
    icon: <Terminal size={30} weight="bold" />,
    href: '/app#subjects',
  },
  {
    id: 'kcs-402-tafl',
    name: 'Theory of Automata (TAFL)',
    code: 'KCS-402',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-7 h-7 sm:w-8 sm:h-8"
        aria-hidden="true"
      >
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="18" cy="18" r="3" />
        <path d="M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4" />
      </svg>
    ),
    href: '/app#subjects',
  },
  {
    id: 'kcs-403-oop',
    name: 'Object Oriented Programming',
    code: 'KCS-403',
    icon: <Code size={30} weight="bold" />,
    href: '/app#subjects',
  },
  {
    id: 'kcs-501-dbms',
    name: 'Database Management (DBMS)',
    code: 'KCS-501',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-7 h-7 sm:w-8 sm:h-8"
        aria-hidden="true"
      >
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
    href: '/app#subjects',
  },
  {
    id: 'kcs-502-cd',
    name: 'Compiler Design',
    code: 'KCS-502',
    icon: <FileText size={30} weight="regular" />,
    href: '/app#subjects',
  },
  {
    id: 'kcs-503-daa',
    name: 'Design & Analysis of Algorithms',
    code: 'KCS-503',
    icon: <TrendUp size={30} weight="bold" />,
    href: '/app#subjects',
  },
  {
    id: 'kcs-601-cn',
    name: 'Computer Networks',
    code: 'KCS-601',
    icon: <Globe size={30} weight="regular" />,
    href: '/app#subjects',
  },
];

export default function Services() {
  const reduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: reduceMotion ? {} : { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: EASE_PREMIUM },
    },
  };

  return (
    <section
      id="services"
      className="relative w-full overflow-hidden bg-[#09090B] py-16 sm:py-20 md:py-24"
    >
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
        
        {/* 1. Section Header matching AKTU Curriculum */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, ease: EASE_PREMIUM }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10 text-left"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 mb-2.5 backdrop-blur-md">
              <span className="font-sans text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
                AKTU B.Tech CSE Curriculum
              </span>
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-[2.25rem] text-white tracking-tight leading-tight">
              Explore AKTU CSE Subjects
            </h2>
            <p className="font-sans text-xs sm:text-sm text-zinc-400 mt-1.5 font-normal">
              Official university syllabus across semesters — master fundamental logic to advanced systems.
            </p>
          </div>

          <a
            href="/app#subjects"
            className="group inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 font-sans text-xs sm:text-[13px] font-semibold text-black shadow-[0_2px_12px_rgba(255,255,255,0.1)] hover:bg-neutral-200 active:scale-95 transition-all duration-300 ease-premium shrink-0 cursor-pointer w-fit"
          >
            <span>View All Semester Topics</span>
            <ArrowUpRight
              size={14}
              weight="bold"
              className="transition-transform duration-300 ease-premium group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </a>
        </motion.div>

        {/* 2. Subjects Grid: 10 Cards in 5x2 Layout */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3.5"
        >
          {SUBJECTS.map((subject) => (
            <motion.a
              key={subject.id}
              href={subject.href}
              variants={itemVariants}
              className="group relative flex flex-col items-center justify-between min-h-[114px] sm:min-h-[122px] md:min-h-[128px] p-3 sm:p-3.5 rounded-2xl border border-white/[0.08] bg-[#111113] hover:bg-[#18181c] hover:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-200 ease-out cursor-pointer active:scale-[0.98]"
            >
              <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 group-hover:text-zinc-400 transition-colors">
                {subject.code}
              </span>
              <div className="h-8 sm:h-9 flex items-center justify-center text-zinc-300 group-hover:text-white transition-colors duration-200 my-1">
                {subject.icon}
              </div>
              <span className="font-sans text-[11px] sm:text-[12px] font-medium text-zinc-300 group-hover:text-white text-center tracking-tight leading-tight transition-colors duration-200 select-none line-clamp-2">
                {subject.name}
              </span>
            </motion.a>
          ))}
        </motion.div>

        {/* 3. CTA Banner: Unlock Your Full Academic Potential */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.7, ease: EASE_PREMIUM }}
          className="relative mt-10 sm:mt-16 overflow-hidden rounded-[20px] sm:rounded-[30px] border border-white/15 border-t-white/30 bg-gradient-to-b from-[#131316] via-[#0d0d10] to-[#070708] px-5 py-8 sm:px-12 sm:py-12 md:py-14 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_24px_80px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
        >
          {/* Top ambient radial spotlight */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 -top-16 -translate-x-1/2 h-[220px] w-[600px] rounded-full opacity-35 blur-[70px] z-0"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)',
            }}
          />

          {/* Bottom-left curved specular light sweep */}
          <svg
            className="pointer-events-none absolute bottom-0 left-0 h-full w-[42%] max-w-[440px] opacity-70 select-none z-0"
            viewBox="0 0 440 260"
            fill="none"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M -10 260 C 110 240, 210 180, 380 0"
              stroke="url(#ctaLeftGlow)"
              strokeWidth="2.5"
            />
            <path
              d="M -10 260 C 110 240, 210 180, 380 0"
              stroke="url(#ctaLeftGlow)"
              strokeWidth="10"
              strokeOpacity="0.4"
              filter="blur(8px)"
            />
            <defs>
              <linearGradient id="ctaLeftGlow" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
                <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Bottom-right curved specular light sweep */}
          <svg
            className="pointer-events-none absolute bottom-0 right-0 h-full w-[42%] max-w-[440px] opacity-70 select-none z-0"
            viewBox="0 0 440 260"
            fill="none"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 450 260 C 330 240, 230 180, 60 0"
              stroke="url(#ctaRightGlow)"
              strokeWidth="2.5"
            />
            <path
              d="M 450 260 C 330 240, 230 180, 60 0"
              stroke="url(#ctaRightGlow)"
              strokeWidth="10"
              strokeOpacity="0.4"
              filter="blur(8px)"
            />
            <defs>
              <linearGradient id="ctaRightGlow" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
                <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Banner Content */}
          <div className="relative z-10 mx-auto max-w-2xl">
            <h3 className="font-display font-bold text-xl sm:text-3xl md:text-[2.25rem] leading-tight text-white tracking-tight">
              Unlock Your Full Academic Potential
            </h3>
            
            <p className="mx-auto mt-2.5 max-w-xl font-sans text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed">
              Start learning with your 24/7 personal AI Tutor. Master tough concepts, ace your exams, and build deep confidence.
            </p>

            <div className="mt-7 flex justify-center">
              <a
                href="/app"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-sans text-xs sm:text-sm font-semibold text-black shadow-[0_4px_24px_rgba(255,255,255,0.18)] hover:bg-neutral-100 active:scale-[0.97] transition-all duration-200 cursor-pointer"
              >
                <span>Start Learning Free</span>
                <ArrowUpRight
                  size={15}
                  weight="bold"
                  className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </a>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
