SET check_function_bodies = false;
CREATE TABLE public.reach_logs (
    id integer NOT NULL,
    status boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reach_num integer DEFAULT 0 NOT NULL
);
COMMENT ON TABLE public.reach_logs IS 'リーチ数を記録するテーブル';
CREATE FUNCTION public.decrement_latest_reach_log() RETURNS SETOF public.reach_logs
    LANGUAGE plpgsql
    AS $$
DECLARE
    latest_reach_num INT;
BEGIN
    -- 最新のレコードを一件取得、最初になければ0を入れる --
    SELECT COALESCE((SELECT reach_num FROM reach_logs ORDER BY created_at DESC LIMIT 1), 0)
    INTO latest_reach_num;
    -- 新しいレコードを一件取得、最初になければ0を入れる --
    RETURN QUERY
    INSERT INTO reach_logs (status, reach_num, created_at)
    VALUES (false, latest_reach_num - 1, NOW())
    RETURNING *;
END;
$$;
CREATE FUNCTION public.decrementlatestreachlog() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- 最新のreachLogを取得し、そのreachNumを減少させる
  UPDATE reach_logs
  SET reach_num = reach_num - 1
  WHERE id = (SELECT id FROM reach_logs ORDER BY created_at DESC LIMIT 1);
END;
$$;
CREATE FUNCTION public.increment_latest_reach_log() RETURNS SETOF public.reach_logs
    LANGUAGE plpgsql
    AS $$
DECLARE
    latest_reach_num INT;
BEGIN
    -- 最新のレコードを一件取得、もしデータがなければ0を入れる --
    SELECT COALESCE((SELECT reach_num FROM reach_logs ORDER BY created_at DESC LIMIT 1), 0)
    INTO latest_reach_num;
    -- 新しいレコードを挿入、reach_numを1増やす
    RETURN QUERY
    INSERT INTO reach_logs (status, reach_num, created_at)
    VALUES (true, latest_reach_num + 1, NOW())
    RETURNING *;
END;
$$;
CREATE FUNCTION public.incrementlatestreachlog() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- 最新のreachLogを取得し、そのreachNumを増加させる
  UPDATE reach_logs
  SET reach_num = reach_num + 1
  WHERE id = (SELECT id FROM reach_logs ORDER BY created_at DESC LIMIT 1);
END;
$$;
CREATE FUNCTION public.set_current_timestamp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$;
CREATE TABLE public.images (
    id integer NOT NULL,
    bucket_name text DEFAULT '""'::text NOT NULL,
    file_name text DEFAULT '""'::text NOT NULL,
    file_type text DEFAULT '""'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.images IS 'MinIOに保存された画像データのリンクを管理するテーブル';
CREATE SEQUENCE public.images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.images_id_seq OWNED BY public.images.id;
CREATE TABLE public.numbers (
    id integer NOT NULL,
    number integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.numbers IS 'ビンゴの出た数字を記録';
COMMENT ON COLUMN public.numbers.number IS 'ビンゴの数値データ';
CREATE SEQUENCE public.numbers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.numbers_id_seq OWNED BY public.numbers.id;
CREATE TABLE public.prizes (
    id integer NOT NULL,
    is_won boolean DEFAULT false NOT NULL,
    image_id integer DEFAULT '-1'::integer NOT NULL,
    name_jp text DEFAULT '""'::text NOT NULL,
    name_en text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.prizes IS 'ビンゴの景品データを格納';
COMMENT ON COLUMN public.prizes.is_won IS '当選した景品はTrueになる';
COMMENT ON COLUMN public.prizes.image_id IS 'imagesのidが入る';
COMMENT ON COLUMN public.prizes.name_jp IS '景品の日本語名';
COMMENT ON COLUMN public.prizes.name_en IS '景品の英語名';
CREATE SEQUENCE public.prizes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.prizes_id_seq OWNED BY public.prizes.id;
CREATE SEQUENCE public.reach_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.reach_log_id_seq OWNED BY public.reach_logs.id;
CREATE TABLE public.stamp_triggers (
    id integer NOT NULL,
    name text DEFAULT '""'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.stamp_triggers IS 'スタンプを降らせるためのAPI';
CREATE SEQUENCE public.stamp_triggers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.stamp_triggers_id_seq OWNED BY public.stamp_triggers.id;
ALTER TABLE ONLY public.images ALTER COLUMN id SET DEFAULT nextval('public.images_id_seq'::regclass);
ALTER TABLE ONLY public.numbers ALTER COLUMN id SET DEFAULT nextval('public.numbers_id_seq'::regclass);
ALTER TABLE ONLY public.prizes ALTER COLUMN id SET DEFAULT nextval('public.prizes_id_seq'::regclass);
ALTER TABLE ONLY public.reach_logs ALTER COLUMN id SET DEFAULT nextval('public.reach_log_id_seq'::regclass);
ALTER TABLE ONLY public.stamp_triggers ALTER COLUMN id SET DEFAULT nextval('public.stamp_triggers_id_seq'::regclass);
ALTER TABLE ONLY public.images
    ADD CONSTRAINT images_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.numbers
    ADD CONSTRAINT numbers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.prizes
    ADD CONSTRAINT prizes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.reach_logs
    ADD CONSTRAINT reach_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.stamp_triggers
    ADD CONSTRAINT stamp_triggers_pkey PRIMARY KEY (id);
CREATE TRIGGER set_public_stamp_triggers_updated_at BEFORE UPDATE ON public.stamp_triggers FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_stamp_triggers_updated_at ON public.stamp_triggers IS 'trigger to set value of column "updated_at" to current timestamp on row update';
ALTER TABLE ONLY public.prizes
    ADD CONSTRAINT prizes_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.images(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
