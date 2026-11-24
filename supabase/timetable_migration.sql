-- ==============================================================================
-- AI STUDY TIMETABLE SCHEDULER MIGRATION
-- Table, indexes, and RLS policies for student weekly study timetables.
-- ==============================================================================

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

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_timetables TO authenticated;
GRANT ALL ON public.student_timetables TO service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
