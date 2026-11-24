-- ==============================================================================
-- ONBOARDING & PERSONALIZED LEARNING PREFERENCES MIGRATION
-- Adds academic profile, learning preferences, goals, and completion tracking
-- to public.profiles. Preserves existing user profiles and data.
-- ==============================================================================

-- 1. Academic Information
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS semester SMALLINT CHECK (semester BETWEEN 1 AND 8);

-- 2. Learning Preferences
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS programming_proficiency TEXT DEFAULT 'Beginner';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS learning_approach TEXT DEFAULT 'Step-by-step explanations';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS explanation_depth TEXT DEFAULT 'Balanced';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'English';

-- 3. Learning Goals & Time
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_goals JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subjects_of_interest JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weak_subjects JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_learning_time TEXT DEFAULT '1-2 hours';

-- 4. Onboarding Status Tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Ensure service_role and authenticated have permissions on profiles
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Reload Supabase Schema Cache
NOTIFY pgrst, 'reload schema';
