-- Table: public.tbl_mymaps

-- DROP TABLE IF EXISTS public.tbl_mymaps;

CREATE TABLE IF NOT EXISTS public.tbl_mymaps
(
    id uuid NOT NULL DEFAULT uuid_generate_v1(),
    json text COLLATE pg_catalog."default",
    date_created date,
    email character varying COLLATE pg_catalog."default",
    name character varying COLLATE pg_catalog."default",
    lastimported timestamp with time zone,
    jsonhash character varying COLLATE pg_catalog."default",
    CONSTRAINT tbl_mymaps_pk PRIMARY KEY (id),
    CONSTRAINT tbl_mymaps_email_name_key UNIQUE (email, name)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tbl_mymaps
    OWNER to postgres;
-- Index: idx_tbl_mymaps_email

-- DROP INDEX IF EXISTS public.idx_tbl_mymaps_email;

CREATE INDEX IF NOT EXISTS idx_tbl_mymaps_email
    ON public.tbl_mymaps USING btree
    (email COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default
    WHERE email IS NOT NULL;
-- Index: idx_tbl_mymaps_jsonhash

-- DROP INDEX IF EXISTS public.idx_tbl_mymaps_jsonhash;

CREATE INDEX IF NOT EXISTS idx_tbl_mymaps_jsonhash
    ON public.tbl_mymaps USING btree
    (jsonhash COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default
    WHERE jsonhash IS NOT NULL;