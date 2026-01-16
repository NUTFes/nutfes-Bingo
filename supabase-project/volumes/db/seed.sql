-- Seed numbers 1 to 75
INSERT INTO public.numbers (number)
SELECT generate_series(1, 75);

-- Seed initial event
INSERT INTO public.events (survey_url, is_survey_active)
VALUES ('https://example.com/survey', false);

-- You might want to seed some initial stamp triggers if needed
INSERT INTO public.stamp_triggers (name) VALUES ('Initial Stamp');
