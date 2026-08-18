-- Table: public.tbl_app_stats

-- DROP TABLE IF EXISTS public.tbl_app_stats;

CREATE TABLE IF NOT EXISTS public.tbl_app_stats
(
    app_name text COLLATE pg_catalog."default",
    action_type text COLLATE pg_catalog."default",
    action_description text COLLATE pg_catalog."default",
    action_date timestamp with time zone,
    id integer NOT NULL DEFAULT nextval('tbl_app_stats_id_seq'::regclass),
    ip character varying COLLATE pg_catalog."default",
    user_name character varying COLLATE pg_catalog."default",
    CONSTRAINT tbl_app_stats_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.tbl_app_stats
    OWNER to postgres;
-- Index: tbl_app_stats_ip_idx

-- DROP INDEX IF EXISTS public.tbl_app_stats_ip_idx;

CREATE INDEX IF NOT EXISTS tbl_app_stats_ip_idx
    ON public.tbl_app_stats USING btree
    (ip COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;