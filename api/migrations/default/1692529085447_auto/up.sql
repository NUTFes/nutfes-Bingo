SET check_function_bodies = false;
CREATE TABLE public.bingo_number (
    id integer NOT NULL,
    data integer DEFAULT 0
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
    name text DEFAULT 'null'::text,
    existing boolean DEFAULT true NOT NULL,
    image text DEFAULT 'null'::text
);
CREATE SEQUENCE public.bingo_prize_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.bingo_prize_id_seq OWNED BY public.bingo_prize.id;
ALTER TABLE ONLY public.bingo_number ALTER COLUMN id SET DEFAULT nextval('public.bingo_number_id_seq'::regclass);
ALTER TABLE ONLY public.bingo_prize ALTER COLUMN id SET DEFAULT nextval('public.bingo_prize_id_seq'::regclass);
ALTER TABLE ONLY public.bingo_number
    ADD CONSTRAINT bingo_number_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.bingo_prize
    ADD CONSTRAINT bingo_prize_pkey PRIMARY KEY (id);
