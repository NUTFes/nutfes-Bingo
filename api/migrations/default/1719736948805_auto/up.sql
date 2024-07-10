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
CREATE TABLE public.bingo_number (
    id integer NOT NULL,
    number integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.bingo_number IS 'ビンゴの出た数字を記録';
CREATE SEQUENCE public.bingo_number_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.bingo_number_id_seq OWNED BY public.bingo_number.id;
CREATE TABLE public.bingo_prize (
    id integer NOT NULL,
    "isWon" boolean DEFAULT false,
    "imageId" integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    "nameJp" text,
    "nameEn" text
);
COMMENT ON TABLE public.bingo_prize IS 'ビンゴの景品データを格納';
CREATE SEQUENCE public.bingo_prize_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.bingo_prize_id_seq OWNED BY public.bingo_prize.id;
CREATE TABLE public.prize_image (
    id integer NOT NULL,
    "bucketName" text,
    "fimeName" text,
    "fimeType" text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.prize_image IS 'minioの画像データを保管する';
CREATE SEQUENCE public.prize_image_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.prize_image_id_seq OWNED BY public.prize_image.id;
ALTER TABLE ONLY public.bingo_number ALTER COLUMN id SET DEFAULT nextval('public.bingo_number_id_seq'::regclass);
ALTER TABLE ONLY public.bingo_prize ALTER COLUMN id SET DEFAULT nextval('public.bingo_prize_id_seq'::regclass);
ALTER TABLE ONLY public.prize_image ALTER COLUMN id SET DEFAULT nextval('public.prize_image_id_seq'::regclass);
ALTER TABLE ONLY public.bingo_number
    ADD CONSTRAINT bingo_number_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.bingo_prize
    ADD CONSTRAINT bingo_prize_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.prize_image
    ADD CONSTRAINT prize_image_pkey PRIMARY KEY (id);
CREATE TRIGGER set_public_bingo_number_updated_at BEFORE UPDATE ON public.bingo_number FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_bingo_number_updated_at ON public.bingo_number IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_bingo_prize_updated_at BEFORE UPDATE ON public.bingo_prize FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_bingo_prize_updated_at ON public.bingo_prize IS 'trigger to set value of column "updated_at" to current timestamp on row update';
CREATE TRIGGER set_public_prize_image_updated_at BEFORE UPDATE ON public.prize_image FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
COMMENT ON TRIGGER set_public_prize_image_updated_at ON public.prize_image IS 'trigger to set value of column "updated_at" to current timestamp on row update';
