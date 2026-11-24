-- ==============================================================================
-- AGENTIC AI DOCUMENT LEARNING MODULE MIGRATION
-- Enables pgvector, creates student_documents and document_chunks tables,
-- sets up similarity search RPC and Row Level Security (RLS) policies.
-- ==============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Master Table: Uploaded Documents
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

-- 3. Chunk & Embedding Table
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.student_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    page_number INT DEFAULT 1,
    heading TEXT,
    embedding vector(384), -- 384 dimensions for all-MiniLM-L6-v2
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON public.document_chunks(user_id);

-- Vector similarity index using IVFFlat
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
    ON public.document_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- 4. Fast Vector Search RPC Function
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

-- 5. Row Level Security (RLS)
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

-- 6. Permissions & Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION match_document_chunks(vector(384), UUID, UUID, INT) TO authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 7. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
