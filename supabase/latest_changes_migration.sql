-- ==============================================================================
-- COMPREHENSIVE SUPABASE MIGRATION: LATEST MAIN BRANCH UPDATES
-- Safe and idempotent: will NOT delete or overwrite existing data.
-- Run this in your Supabase Dashboard -> SQL Editor -> Run
--
-- Fixes resolved by this script:
--   1. "column profiles.year_of_study does not exist"
--   2. "Could not find the table 'public.quiz_attempts' in the schema cache" (PGRST205)
--   3. "Could not find the table 'public.learning_roadmaps' in the schema cache" (PGRST205)
--   4. "Could not find the table 'public.student_timetables' in the schema cache" (PGRST205)
--   5. "permission denied for table conversations / messages" (Error 42501 for service_role)
--   6. Agentic AI Document Learning tables (pgvector, student_documents, document_chunks)
--   7. Personalized Learning Onboarding & Profile preferences columns
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE: ADD MISSING COLUMNS
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS year_of_study SMALLINT CHECK (year_of_study BETWEEN 1 AND 4);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS semester SMALLINT CHECK (semester BETWEEN 1 AND 8);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS programming_proficiency TEXT DEFAULT 'Beginner';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS learning_approach TEXT DEFAULT 'Step-by-step explanations';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS explanation_depth TEXT DEFAULT 'Balanced';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'English';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_goals JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subjects_of_interest JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weak_subjects JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_learning_time TEXT DEFAULT '1-2 hours';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- ------------------------------------------------------------------------------
-- 2. LEARNING ROADMAPS TABLE (Fixes PGRST205 for learning_roadmaps)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    roadmap JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_user_subject_topic_roadmap UNIQUE (user_id, subject, topic)
);

CREATE INDEX IF NOT EXISTS idx_roadmaps_user 
    ON public.learning_roadmaps(user_id, subject);

ALTER TABLE public.learning_roadmaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roadmaps_own" ON public.learning_roadmaps;
CREATE POLICY "roadmaps_own" ON public.learning_roadmaps
    FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_roadmaps TO authenticated;
GRANT ALL ON public.learning_roadmaps TO service_role;

-- ------------------------------------------------------------------------------
-- 3. QUIZ ATTEMPTS TABLE (Fixes PGRST205 for quiz_attempts & Analytics page)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    topic_name TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    score INT DEFAULT 0,
    total INT DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quiz_user_topic 
    ON public.quiz_attempts(user_id, topic_name);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_own" ON public.quiz_attempts;
CREATE POLICY "quiz_own" ON public.quiz_attempts
    FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;

-- ------------------------------------------------------------------------------
-- 4. AGENTIC AI DOCUMENT LEARNING MODULE (pgvector RAG)
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INT NOT NULL,
    detected_subject TEXT NOT NULL DEFAULT 'Computer Science',
    relevance_score FLOAT NOT NULL DEFAULT 1.0,
    rejection_reason TEXT,
    is_valid BOOLEAN DEFAULT TRUE NOT NULL,
    summary TEXT,
    page_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_documents_user ON public.student_documents(user_id);

CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.student_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    page_number INT DEFAULT 1,
    heading TEXT,
    embedding vector(384),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON public.document_chunks(user_id);

-- Vector similarity index using IVFFlat
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
    ON public.document_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Vector search RPC function
CREATE OR REPLACE FUNCTION match_document_chunks (
    query_embedding vector(384),
    filter_document_id UUID,
    filter_user_id UUID,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    page_number INT,
    heading TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF (auth.role() <> 'service_role') AND (auth.uid() IS DISTINCT FROM filter_user_id) THEN
        RAISE EXCEPTION 'Permission denied: filter_user_id does not match authenticated user';
    END IF;

    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        dc.page_number,
        dc.heading,
        (1 - (dc.embedding <=> query_embedding))::FLOAT AS similarity
    FROM public.document_chunks dc
    WHERE dc.document_id = filter_document_id
      AND dc.user_id = filter_user_id
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_documents_own" ON public.student_documents;
CREATE POLICY "user_documents_own" ON public.student_documents
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_chunks_own" ON public.document_chunks;
CREATE POLICY "user_chunks_own" ON public.document_chunks
    FOR ALL TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION match_document_chunks(vector(384), UUID, UUID, INT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. AI STUDY TIMETABLE SCHEDULER (Fixes PGRST205 for student_timetables)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
    generation_context JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_timetables_user ON public.student_timetables(user_id);
CREATE INDEX IF NOT EXISTS idx_timetables_user_active ON public.student_timetables(user_id, is_active);

-- Automatic updated_at trigger
DROP TRIGGER IF EXISTS trg_timetables_updated_at ON public.student_timetables;
CREATE TRIGGER trg_timetables_updated_at
    BEFORE UPDATE ON public.student_timetables
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Row Level Security (RLS)
ALTER TABLE public.student_timetables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timetables_own" ON public.student_timetables;
CREATE POLICY "timetables_own" ON public.student_timetables
    FOR ALL
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_timetables TO authenticated;
GRANT ALL ON public.student_timetables TO service_role;

-- ------------------------------------------------------------------------------
-- 6. FIX PERMISSION DENIED (42501) FOR SERVICE ROLE ON CONVERSATIONS & MESSAGES
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_topic_mastery TO authenticated;

-- Full administrative privileges for backend microservices
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

-- ------------------------------------------------------------------------------
-- 7. RELOAD SCHEMA CACHE
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
