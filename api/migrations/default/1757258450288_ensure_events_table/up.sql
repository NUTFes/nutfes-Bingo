-- Ensure events table exists (added after prod hotfix)
CREATE TABLE IF NOT EXISTS public.events (
  id BIGSERIAL PRIMARY KEY,
  survey_url text NOT NULL,
  is_survey_active boolean NOT NULL DEFAULT false
);
