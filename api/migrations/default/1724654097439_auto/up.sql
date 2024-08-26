SET check_function_bodies = false;
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
CREATE TABLE public.stamp_triggers (
    id integer NOT NULL,
    name text DEFAULT '""'::text NOT NULL,
    trigger boolean DEFAULT false NOT NULL
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
ALTER TABLE ONLY public.stamp_triggers ALTER COLUMN id SET DEFAULT nextval('public.stamp_triggers_id_seq'::regclass);
ALTER TABLE ONLY public.images
    ADD CONSTRAINT images_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.numbers
    ADD CONSTRAINT numbers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.prizes
    ADD CONSTRAINT prizes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.stamp_triggers
    ADD CONSTRAINT stamp_triggers_name_key UNIQUE (name);
ALTER TABLE ONLY public.stamp_triggers
    ADD CONSTRAINT stamp_triggers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.prizes
    ADD CONSTRAINT prizes_image_id_fkey FOREIGN KEY (image_id) REFERENCES public.images(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
