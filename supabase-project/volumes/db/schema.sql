-- Create tables
CREATE TABLE IF NOT EXISTS public.numbers (
    id SERIAL PRIMARY KEY,
    number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.images (
    id SERIAL PRIMARY KEY,
    bucket_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.prizes (
    id SERIAL PRIMARY KEY,
    is_won BOOLEAN DEFAULT false,
    image_id INTEGER REFERENCES public.images(id),
    name_jp TEXT NOT NULL,
    name_en TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reach_logs (
    id SERIAL PRIMARY KEY,
    status BOOLEAN DEFAULT false,
    reach_num INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.stamp_triggers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.events (
    id SERIAL PRIMARY KEY,
    survey_url TEXT NOT NULL,
    is_survey_active BOOLEAN DEFAULT false
);

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.numbers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.images;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prizes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reach_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stamp_triggers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;

-- Enable Row Level Security (RLS)
ALTER TABLE public.numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reach_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamp_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policies for 'numbers'
-- Anyone can read
CREATE POLICY "Public Read numbers" ON public.numbers FOR SELECT USING (true);
-- Only authenticated users (admins) can Insert/Update/Delete
CREATE POLICY "Admin All numbers" ON public.numbers FOR ALL USING (auth.role() = 'authenticated');

-- Policies for 'images'
CREATE POLICY "Public Read images" ON public.images FOR SELECT USING (true);
CREATE POLICY "Admin All images" ON public.images FOR ALL USING (auth.role() = 'authenticated');

-- Policies for 'prizes'
CREATE POLICY "Public Read prizes" ON public.prizes FOR SELECT USING (true);
CREATE POLICY "Admin All prizes" ON public.prizes FOR ALL USING (auth.role() = 'authenticated');

-- Policies for 'events'
CREATE POLICY "Public Read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Admin All events" ON public.events FOR ALL USING (auth.role() = 'authenticated');

-- Policies for 'reach_logs'
-- User needs to see previous reach count to increment it (Select), and add new log (Insert)
CREATE POLICY "Public Read reach_logs" ON public.reach_logs FOR SELECT USING (true);
CREATE POLICY "Public Insert reach_logs" ON public.reach_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin All reach_logs" ON public.reach_logs FOR ALL USING (auth.role() = 'authenticated');

-- Policies for 'stamp_triggers'
-- User only inserts triggers
CREATE POLICY "Public Insert stamp_triggers" ON public.stamp_triggers FOR INSERT WITH CHECK (true);
-- Admin can view/manage
CREATE POLICY "Admin All stamp_triggers" ON public.stamp_triggers FOR ALL USING (auth.role() = 'authenticated');
