-- ============================================================
-- Orion — Availability Status Migration
-- Run this in the Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- 1. Remove open_to from profiles if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS open_to;

-- 2. Remove role from profiles if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- 3. Create availability_status table
CREATE TABLE IF NOT EXISTS public.availability_status (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN ('coffee_chats', 'cofounder', 'hiring', 'mentorship')),
  is_active   boolean     NOT NULL DEFAULT false,
  expires_at  timestamptz,
  note        text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type)
);

-- 4. Auto-update updated_at
CREATE TRIGGER availability_status_updated_at
  BEFORE UPDATE ON public.availability_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. RLS policies
ALTER TABLE public.availability_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability: authenticated read"
  ON public.availability_status FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "availability: owner insert"
  ON public.availability_status FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "availability: owner update"
  ON public.availability_status FOR UPDATE
  TO authenticated USING (user_id = auth.uid());
