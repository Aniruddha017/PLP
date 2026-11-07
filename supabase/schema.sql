-- ==============================================================================
-- AI TUTOR PRODUCTION DATABASE SCHEMA
-- Tailored for University / College Capstone Major Project
-- Features: Profiles, Conversations, Messages, Study Plan / Topic Mastery,
--           Strict Row Level Security (RLS) & Performance Composite Indexes
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. PROFILES TABLE (1:1 with auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    learning_goal TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Idempotent column cleanup if migrating from previous draft
ALTER TABLE public.profiles DROP COLUMN IF EXISTS tier;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_customer_id;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ==============================================================================
-- 3. CONVERSATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT DEFAULT 'General' NOT NULL,
    topic TEXT,
    is_bookmarked BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Composite index: user's conversations sorted by latest activity (Supabase Best Practice)
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated 
    ON public.conversations(user_id, updated_at DESC);

-- ==============================================================================
-- 4. MESSAGES TABLE
-- Relational hierarchy: Messages belong to a conversation.
-- Supports rich pedagogical metadata: LaTeX formulas, side-by-side cards, key insights, feedback
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for AI Tutor / System
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    cards JSONB DEFAULT '[]'::jsonb,
    key_insight TEXT,
    feedback TEXT CHECK (feedback IN ('up', 'down', NULL)),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Composite index: fast chronological message thread retrieval
CREATE INDEX IF NOT EXISTS idx_messages_conv_created 
    ON public.messages(conversation_id, created_at ASC);

-- ==============================================================================
-- 5. STUDENT TOPIC MASTERY & STUDY PLAN
-- Powers the Adaptive Study Plan Modal and Spaced-Repetition Tracker
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.student_topic_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    topic_name TEXT NOT NULL,
    mastery_percentage INT DEFAULT 0 CHECK (mastery_percentage BETWEEN 0 AND 100) NOT NULL,
    status TEXT DEFAULT 'Up Next' CHECK (status IN ('Up Next', 'In Review', 'Mastered')) NOT NULL,
    next_review_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day'),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_user_subject_topic UNIQUE (user_id, subject, topic_name)
);

CREATE INDEX IF NOT EXISTS idx_topic_mastery_user 
    ON public.student_topic_mastery(user_id, subject);

-- ==============================================================================
-- 6. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON public.conversations;
CREATE TRIGGER trg_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_topic_mastery_updated_at ON public.student_topic_mastery;
CREATE TRIGGER trg_topic_mastery_updated_at
    BEFORE UPDATE ON public.student_topic_mastery
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ==============================================================================
-- 7. AUTOMATIC USER PROFILE TRIGGER (Sync on Email & Google OAuth Signup)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    user_full_name TEXT;
    user_avatar TEXT;
BEGIN
    -- Extract full name from raw_user_meta_data (Google OAuth or Email sign up)
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- Extract avatar URL if provided (Google OAuth)
    user_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        ''
    );

    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (NEW.id, NEW.email, user_full_name, user_avatar)
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
        avatar_url = COALESCE(NULLIF(public.profiles.avatar_url, ''), EXCLUDED.avatar_url),
        updated_at = NOW();

    -- Seed starter topic mastery topics for new learners
    INSERT INTO public.student_topic_mastery (user_id, subject, topic_name, mastery_percentage, status, next_review_at)
    VALUES
        (NEW.id, 'Calculus III', 'Stokes’ Theorem in 3D', 88, 'In Review', NOW() + INTERVAL '1 day'),
        (NEW.id, 'Calculus III', 'Divergence Theorem', 74, 'Up Next', NOW() + INTERVAL '2 days'),
        (NEW.id, 'Calculus III', 'Line Integrals & Green’s Theorem', 95, 'Mastered', NOW() + INTERVAL '4 days'),
        (NEW.id, 'Algorithms', 'QuickSort Analysis', 82, 'In Review', NOW() + INTERVAL '1 day'),
        (NEW.id, 'Probability', 'Bayes’ Theorem', 90, 'Mastered', NOW() + INTERVAL '3 days')
    ON CONFLICT (user_id, subject, topic_name) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Revoke public execution of security definer trigger (Supabase Linter Advisor Fix)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Revoke execute on advisor warning function if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable') THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict, audited Supabase standard using TO authenticated & (select auth.uid())
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_topic_mastery ENABLE ROW LEVEL SECURITY;

-- 8.1 PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

-- 8.2 CONVERSATIONS POLICIES
DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
CREATE POLICY "conversations_select_own" ON public.conversations
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
CREATE POLICY "conversations_insert_own" ON public.conversations
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;
CREATE POLICY "conversations_update_own" ON public.conversations
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "conversations_delete_own" ON public.conversations;
CREATE POLICY "conversations_delete_own" ON public.conversations
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- 8.3 MESSAGES POLICIES (Relational check via conversation ownership)
DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
CREATE POLICY "messages_select_own" ON public.messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND c.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own" ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND c.user_id = (SELECT auth.uid())
        )
        AND (role = 'user') -- Students can only insert their own role messages
    );

DROP POLICY IF EXISTS "messages_update_feedback" ON public.messages;
CREATE POLICY "messages_update_feedback" ON public.messages
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND c.user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND c.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;
CREATE POLICY "messages_delete_own" ON public.messages
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND c.user_id = (SELECT auth.uid())
        )
    );

-- 8.4 TOPIC MASTERY POLICIES
DROP POLICY IF EXISTS "mastery_select_own" ON public.student_topic_mastery;
CREATE POLICY "mastery_select_own" ON public.student_topic_mastery
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "mastery_insert_own" ON public.student_topic_mastery;
CREATE POLICY "mastery_insert_own" ON public.student_topic_mastery
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "mastery_update_own" ON public.student_topic_mastery;
CREATE POLICY "mastery_update_own" ON public.student_topic_mastery
    FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "mastery_delete_own" ON public.student_topic_mastery;
CREATE POLICY "mastery_delete_own" ON public.student_topic_mastery
    FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ==============================================================================
-- 9. PERMISSIONS & DATA API EXPOSURE
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_topic_mastery TO authenticated;

-- ==============================================================================
-- 10. BACKFILL FOR ANY PRE-EXISTING AUTH USERS (Idempotent)
-- ==============================================================================
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', '')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.student_topic_mastery (user_id, subject, topic_name, mastery_percentage, status, next_review_at)
SELECT
    u.id,
    t.subject,
    t.topic_name,
    t.mastery_percentage,
    t.status,
    NOW() + (t.days_ahead * INTERVAL '1 day')
FROM auth.users u
CROSS JOIN (
    VALUES
        ('Calculus III', 'Stokes’ Theorem in 3D', 88, 'In Review', 1),
        ('Calculus III', 'Divergence Theorem', 74, 'Up Next', 2),
        ('Calculus III', 'Line Integrals & Green’s Theorem', 95, 'Mastered', 4),
        ('Algorithms', 'QuickSort Analysis', 82, 'In Review', 1),
        ('Probability', 'Bayes’ Theorem', 90, 'Mastered', 3)
) AS t(subject, topic_name, mastery_percentage, status, days_ahead)
ON CONFLICT (user_id, subject, topic_name) DO NOTHING;
